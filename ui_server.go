package main

import (
	//	"bytes"
	"flag"
	"fmt"
//	"io/ioutil"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
//	"regexp"
//	"strconv"
	"strings"
//	"time"

	//	"github.com/couchbase/gocb"
	//	"github.com/couchbase/gocb/gocbcore"
	//	infer "github.com/couchbase/cbq-gui/inferencer"
	"github.com/couchbase/go-couchbase"
    //"github.com/couchbase/gomemcached/client"
	json "github.com/dustin/gojson"
)

const TEST_URL = "http://localhost:8091/"

var DATASTORE = flag.String("datastore", "http://localhost:8091", "Datastore address (e.g., http://localhost:8091)")
var USER = flag.String("user", "", "Authorized user login for Couchbase")
var PASS = flag.String("pass", "", "Authorized user password for Couchbase")
var LOCALPORT = flag.String("localPort", ":8095", "Port on which the UI runs. E.g., :8095")
var WEBCONTENT = flag.String("webcontent", "./", "Location of static folder containing web content. E.g., ./")
var VERBOSE = flag.Bool("verbose", false, "Produce verbose output about program operation.")

func main() {
	flag.Parse()

	launchWebService(*DATASTORE, *USER, *PASS)
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

	// need to connect to the server...
	if len(user) == 0 {
		client, err = couchbase.Connect(server)
	} else {
	    fmt.Printf("Connecting with user: %v pass: %v\n",user,pass)
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

func launchWebService(server, user, pass string) {
	fmt.Printf("Launching query web service.\n    Using CB Server at: %s\n", server)

	serverUrl = server
	serverUser = user
	serverPass = pass
	
	if (strings.HasPrefix(strings.ToLower(server),"http://")) {
       serverHost = serverUrl[7:]
	} else {
	    serverHost = serverUrl
	}

	//
	// get a query and kv service that we'll need
	//

	var n1ql []string
	var mgmt []string
	n1ql, kvs, mgmt = getClusterQueryKVsAndMgmt(server, user, pass)

	if len(n1ql) == 0 {
		fmt.Printf("Unable to find a N1QL query service on: %s\n", server)
		return
	} else {
		fmt.Printf("    Using N1QL query service on: %s\n", n1ql[0])
		//queryURL = fmt.Sprintf("http://%s/query/service", n1ql[0])
		queryHost = n1ql[0]
	}

	if len(mgmt) == 0 {
		fmt.Printf("Unable to find the mgmt query service on: %s\n", server)
		return
	} else {
		fmt.Printf("    Using mgmt query service on: %s\n", serverHost)
//		for _, url := range kvs {
//			fmt.Printf("    Using memcached service on: %s\n", url)
//			//kvURL = kv[0]
//		}
	}

	//
	// make a gocb connection as well
	//

	//	goClient, err := gocb.Connect(server)
	//	if err != nil {
	//		fmt.Printf("Error with go connection to %v: %v, %v\n", server, err,  goClient)
	//	}

	staticPath := strings.Join([]string{*WEBCONTENT, "query-ui"}, "")

	fmt.Printf("    Using web content at: %s\n", staticPath)

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
    
    mgmtProxy := httputil.NewSingleHostReverseProxy(&url.URL{Scheme: "http", Host: serverHost}) 
    mgmtProxy.Director = toMgmt

    imageProxy := httputil.NewSingleHostReverseProxy(&url.URL{Scheme: "http", Host: serverHost}) 
    imageProxy.Director = toImage

	// handle queries at the service prefix
	http.Handle("/query/service", queryProxy)
	http.Handle("/_p/query/query/service", queryProxy)

	http.Handle("/_p/ui/query/", imageProxy)

	http.Handle("/pools", mgmtProxy)
	http.Handle("/pools/", mgmtProxy)

	// Handle static endpoint for serving the web content
	http.Handle("/", http.FileServer(http.Dir(staticPath)))
	//http.Handle("/_p/ui/query/images/", http.FileServer(http.Dir(fmt.Sprintf("%s/query-ui/images",staticPath))))

	fmt.Printf("Launching UI server, to use, point browser at http://localhost%s\n", *LOCALPORT)

	listenAndServe(*LOCALPORT)

	// keep running until we receive input
	//var input string
	//fmt.Scanln(&input)
	//fmt.Println("done")
}


func toQuery(r *http.Request) {
    r.Host = queryHost
    r.URL.Host = r.Host
    r.URL.Scheme = "http"
    if (strings.HasPrefix(strings.ToLower(r.URL.Path),"/_p/query")) {
        r.URL.Path = r.URL.Path[9:]
    }
}

func toMgmt(r *http.Request) {
    //fmt.Printf("toMgmt, host %v path %v\n",r.Host,r.URL.Path);
    r.Host = serverHost
    r.URL.Host = r.Host
    r.URL.Scheme = "http"
    //fmt.Printf(" post toMgmt, host %v path %v\n",r.Host,r.URL.Path);
}


func toImage(r *http.Request) {
    //fmt.Printf("toImage, path %v\n",r.URL.Path);
    // r.URL.Path = strings.Replace(r.URL.Path,"/_p/ui/query/images/","/images/",1)
    r.URL.Path = strings.Replace(r.URL.Path,"/_p/ui/query/","/",1)
    //r.Host = serverHost
    r.URL.Host = r.Host
    r.URL.Scheme = "http"
    //fmt.Printf(" post toImage, path %v\n",r.URL.Path);
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
