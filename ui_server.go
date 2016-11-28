package main

import (
	"flag"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"io/ioutil"

	"github.com/couchbase/go-couchbase"
	json "github.com/dustin/gojson"
)

const TEST_URL = "http://localhost:8091/"

var DATASTORE = flag.String("datastore", "", "Datastore URL (e.g., http://localhost:8091)")
var USER = flag.String("user", "", "Authorized user login for Couchbase")
var PASS = flag.String("pass", "", "Authorized user password for Couchbase")

var QUERYENGINE = flag.String("queryEngine", "", "Query URL (e.g., http://localhost:8093)")
var QUERY_PREFIX = flag.String("queryPrefix", "/query", "prefix for URL of query service, e.g. '/query' or '/analytics'")

var LOCALPORT = flag.String("localPort", ":8095", "Port on which the UI runs. E.g., :8095")
var WEBCONTENT = flag.String("webcontent", "./", "Location of static folder containing web content. E.g., ./static")
var VERBOSE = flag.Bool("verbose", false, "Produce verbose output about program operation.")

func main() {
	flag.Parse()
	launchWebService()
}


//
// Given a CB Server URL, ask it what ports KV and Query are running on
//

func getClusterQueryKVsAndMgmt(server, user, pass string) ([]string, []string, []string) {
	n1ql := make([]string, 0, 0)
	kvs := make([]string, 0, 0)
	mgmt := make([]string, 0, 0)

	var client couchbase.Client
	var err error

	if len(user) == 0 {
		client, err = couchbase.Connect(server)
	} else {
		fmt.Printf("Connecting with user: %v pass: %v\n", user, pass)
		client, err = couchbase.ConnectWithAuthCreds(server, user, pass)
	}

	if err != nil {
		fmt.Printf("Error with connection to %v: %v\n", server, err)
		return n1ql, kvs, mgmt
	}

	// ...then get the bucket-independent services...
	services, err := client.GetPoolServices("default")
	if err != nil {
		fmt.Printf("Error with pool services: %v\n", err)
		return n1ql, kvs, mgmt
	}

	// ...which then get us to the node-independent services
	for _, nodeService := range services.NodesExt {

		// the host name is either specified, or the boolean flag "ThisNode"
		// indicates that it is the same as the node we connected to
		host_name := nodeService.Hostname
		if nodeService.ThisNode {
			host_name = client.BaseURL.String()
		}
		// remove any port number from the host name
		portIdx := strings.LastIndex(host_name, ":")
		if portIdx > 0 {
			host_name = host_name[0:portIdx]
		}

		// remove any http:// or https://
		if strings.HasPrefix(host_name, "http://") {
			host_name = host_name[7:]
		}
		if strings.HasPrefix(host_name, "https://") {
			host_name = host_name[8:]
		}

		log(fmt.Sprintf("\nHost name is: %v", host_name))

		// now iterate through theh services looking for "kv" and "n1ql"
		for k, v := range nodeService.Services {
			log(fmt.Sprintf("  Got service %v as %v", k, v))

			if strings.EqualFold(k, "n1ql") {
				n1ql = append(n1ql, fmt.Sprintf("%s:%d", host_name, v))
			}
			if strings.EqualFold(k, "mgmt") {
				mgmt = append(mgmt, fmt.Sprintf("%s:%d", host_name, v))
			}
			if strings.EqualFold(k, "kv") {
				kvs = append(kvs, fmt.Sprintf("%s:%d", host_name, v))
			}
		}
	}

	return n1ql, kvs, mgmt
}

//
// our web service has two jobs: it needs to serve up static web content for the
// query UI, using a normal file server.
//
// it *also* needs to proxy the queries from the UI, intercepting 'describe'
// statements and running them here.
//

var serverHost string
var queryHost string
var serverUrl, serverUser, serverPass string
var kvs []string

func launchWebService() {
	fmt.Printf("Launching query web service.\n")

	// the datastore allows us to get /pools, find out where every service is
	if len(*DATASTORE) > 0 {
		fmt.Printf("    Using CB Server at: %s\n", *DATASTORE)

		serverUrl = *DATASTORE
		serverUser = *USER
		serverPass = *PASS

		if strings.HasPrefix(strings.ToLower(*DATASTORE), "http://") {
			serverHost = serverUrl[7:]
		} else {
			serverHost = serverUrl
		}

		//
		// get a query and kv service that we'll need
		//

		var n1ql []string
		var mgmt []string
		n1ql, kvs, mgmt = getClusterQueryKVsAndMgmt(*DATASTORE, *USER, *PASS)

		if len(n1ql) == 0 {
			fmt.Printf("Unable to find a N1QL query service on: %s\n", *DATASTORE)
			return
		} else {
			fmt.Printf("    Using N1QL query service on: %s\n", n1ql[0])
			//queryURL = fmt.Sprintf("http://%s/query/service", n1ql[0])
			queryHost = n1ql[0]
		}

		if len(mgmt) == 0 {
			fmt.Printf("Unable to find the mgmt query service on: %s\n", *DATASTORE)
			return
		} else {
			fmt.Printf("    Using mgmt query service on: %s\n", serverHost)
		}

	} else if len(*QUERYENGINE) > 0 { // if no DATASTORE, there must be a QUERYENGINE

		queryHost = *QUERYENGINE

		if strings.HasPrefix(queryHost, "http://") {
			queryHost = queryHost[7:]
		}

		fmt.Printf("    Using query service on: %s\n", queryHost)

	} else { // let the user know that they need either DATASTORE or QUERYENGINE
		fmt.Printf("Error: you must specify either -datastore=<couchbase URL> or -queryEngine=<query engine URL>\n")
		os.Exit(1)
	}

	//
	// make a set of proxies for query engine, management server, and image content
	//

	staticPath := strings.Join([]string{*WEBCONTENT, "query-ui"}, "")

	fmt.Printf("    Using -webcontent=%s, web content path at: %s\n", *WEBCONTENT, staticPath)

	_, err := os.Stat(staticPath)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Printf(" Can't find static path: %v\n", err)
		} else {
			fmt.Printf(" Error with static path: %v\n", err)
		}
		os.Exit(1)
	}

	// create proxies to query and mgmt ports
	queryProxy := httputil.NewSingleHostReverseProxy(&url.URL{Scheme: "http", Host: queryHost})
	queryProxy.Director = toQuery

	imageProxy := httputil.NewSingleHostReverseProxy(&url.URL{Scheme: "http"})
	imageProxy.Director = toImage

	if len(serverHost) > 0 {
		mgmtProxy := httputil.NewSingleHostReverseProxy(&url.URL{Scheme: "http", Host: serverHost})
		mgmtProxy.Director = toMgmt
		http.Handle("/pools", mgmtProxy)
		http.Handle("/pools/", mgmtProxy)
	}

	// handle queries at the service prefix
	http.Handle("../_p/query/", queryProxy)
	http.Handle("/_p/query/", queryProxy)
	http.Handle("/analytics/service/", queryProxy)

	http.Handle("../_p/ui/query/", imageProxy)
	http.Handle("/_p/ui/query/", imageProxy)

	// Handle static endpoint for serving the web content
	http.Handle("/", http.FileServer(http.Dir(staticPath)))

	fmt.Printf("Launching UI server, to use, point browser at http://localhost%s\n", *LOCALPORT)

	listenAndServe(*LOCALPORT)
}


type Credential struct {
	User string `json:"user"`
	Pass string `json:"pass"`
}
	
type QueryParams struct {
    Statement string `json:"statement"`
    ClientContextId string `json:"client_context_id"`
    Creds []Credential `json:"creds"`
}	

func toQuery(r *http.Request) {
	r.Host = queryHost
	r.URL.Host = r.Host
	r.URL.Scheme = "http"
	
	// rewrite the URL to the approriate proxied value
	//fmt.Printf("Got query path: %s %s\n  form: %v\n", r.Host,r.URL.Path, r.Form)
	if strings.HasPrefix(strings.ToLower(r.URL.Path), "/_p/query/query") {
		r.URL.Path = *QUERY_PREFIX + r.URL.Path[15:]
		//fmt.Printf("  new host %v path: %s\n", r.Host,r.URL.Path)
	}
	if strings.HasPrefix(strings.ToLower(r.URL.Path), "../_p/query/query") {
		r.URL.Path = *QUERY_PREFIX + r.URL.Path[17:]
		//fmt.Printf("  new host %v path: %s\n", r.Host,r.URL.Path)
	}
	
	// if we were given a USER/PASS, we need to insert them into the creds array
	// to give queries those privileges
    if USER != nil && PASS != nil {
        r.SetBasicAuth(*USER, *PASS)
        // create a credentials array with USER and PASS
       	var credentials []Credential = make([]Credential,0,0)
        newCred := new(Credential)
        newCred.User = *USER
        newCred.Pass = *PASS
        credentials = append(credentials,*newCred)

        queryParams := new(QueryParams)
        err := json.NewDecoder(r.Body).Decode(&queryParams) 
        if err != nil {
            log(fmt.Sprintf("Error decoding body: %v\n",err))
            return
        } else {
            log(fmt.Sprintf("Got statement: %s\n",queryParams.Statement))
            log(fmt.Sprintf("Got client context: %s\n",queryParams.ClientContextId))
            log(fmt.Sprintf("Got creds: %v\n",queryParams.Creds))
        }
        
        queryParams.Creds = append(queryParams.Creds,credentials...)
    	
    	newParamBytes,cerr := json.Marshal(queryParams)
    	log(fmt.Sprintf("Got new params: %s\n",string(newParamBytes)))
        if (cerr != nil) {
            log(fmt.Sprintf("Error marshalling new credentials %v\n",cerr))
        } else {
            newBody := string(newParamBytes)
            r.Body = ioutil.NopCloser(strings.NewReader(newBody))
            r.ContentLength = int64(len(newBody))
        }
        

        
        log(fmt.Sprintf("Got new request form: %v\n",r.PostForm))
        //log(fmt.Sprintf("Got new request: %v\n",r))
    }
}

func toImage(r *http.Request) {
	//r.Host = serverHost
	r.URL.Host = r.Host
	r.URL.Scheme = "http"
	//fmt.Printf("Got image path: %s %s\n  form: %v\n", r.Host,r.URL.Path, r.Form)
	if strings.HasPrefix(strings.ToLower(r.URL.Path), "/_p/ui/query") {
		r.URL.Path = r.URL.Path[12:]
		//fmt.Printf("  new host %v path: %s\n", r.Host,r.URL.Path)
	}
	if strings.HasPrefix(strings.ToLower(r.URL.Path), "../_p/ui/query") {
		r.URL.Path = r.URL.Path[14:]
		//fmt.Printf("  new host %v path: %s\n", r.Host,r.URL.Path)
	}
}

func toMgmt(r *http.Request) {
	//fmt.Printf("toMgmt, host %v path %v\n",r.Host,r.URL.Path);
	r.Host = serverHost
	r.URL.Host = r.Host
	r.URL.Scheme = "http"
	
	// if we have a login/password, use it for authorization
    if USER != nil && PASS != nil {
        r.SetBasicAuth(*USER, *PASS)
    }	
	//fmt.Printf(" post toMgmt, host %v path %v\n",r.Host,r.URL.Path);
}

//
// This function is used to launch the http server inside a goroutine, accepting a
// channel that will return any error status.
//

func listenAndServe(localport string) {
	err := http.ListenAndServe(localport, nil)
	if err != nil {
		fmt.Printf("\n\nError launching web server on port %s: %v\n", localport, err)
		os.Exit(1)
	}

}

//
// convenience method for returning errors
//

func writeHttpError(message string, resp http.ResponseWriter) {
	response := map[string]interface{}{}
	response["status"] = "fail"
	response["errors"] = message

	log(message)
	resp.WriteHeader(500)
	bytes, err := json.Marshal(response)
	if err != nil {
		resp.Write([]byte(fmt.Sprintf("internal error marshalling JSON: %v\n", err)))
		return
	}
	resp.Write(bytes)
}

//
// in verbose mode, output messages on the command line
//

func log(message string) {
	if *VERBOSE {
		fmt.Println(message)
	}
}
