package main

import (
	//"bytes"
	"flag"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	//"strconv"

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

//var kvs []string

func launchWebService() {
	fmt.Printf("Launching query web service.\n")

	//
	// error checking
	//

	if len(*WEBCONTENT) == 0 {
		fmt.Printf("Unable to start proxy, -webcontent was not specified.")
		return
	}

	// if we were not given a URL for the QUERYENGINE,
	// the datastore allows us to get /pools, find out where every service is
	if len(*DATASTORE) > 0 {
		fmt.Printf("    Using CB Server at: %s\n", *DATASTORE)

		serverUrl = strings.TrimRight(*DATASTORE, "/")
		serverUser = *USER
		serverPass = *PASS

		if strings.HasPrefix(strings.ToLower(*DATASTORE), "http://") {
			serverHost = serverUrl[7:]
		} else {
			serverHost = serverUrl
		}

		//
		// if we were not given a query engine, use /pools to get a query and
		// kv service that we'll need
		//

		if QUERYENGINE == nil || len(*QUERYENGINE) == 0 {
			var n1ql []string
			var mgmt []string
			n1ql, _, mgmt = getClusterQueryKVsAndMgmt(*DATASTORE, *USER, *PASS)

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
		}

	}

	//
	// if they specified a QUERYENGINE, remember what they specified

	if QUERYENGINE != nil && len(*QUERYENGINE) > 0 { // if no DATASTORE, there must be a QUERYENGINE
		fmt.Printf("    Using CB QueryEngine at: %s\n", *QUERYENGINE)

		queryHost = *QUERYENGINE

		if strings.HasPrefix(queryHost, "http://") {
			queryHost = queryHost[7:]
		}

		fmt.Printf("    Using query service on: %s\n", queryHost)

	}

	if len(serverHost) == 0 && len(queryHost) == 0 { // let the user know that they need either DATASTORE or QUERYENGINE
		fmt.Printf("Error: you must specify -datastore=<couchbase URL> or -queryEngine=<query engine URL>\n")
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
		mgmtProxy.ModifyResponse = fromMgmt
		http.Handle("/pools", mgmtProxy)
		http.Handle("/pools/default", mgmtProxy)
		http.Handle("/pools/default/buckets", mgmtProxy)
		//		http.Handle("/uilogin", mgmtProxy)
		//		http.Handle("/uilogout", mgmtProxy)
		//		http.Handle("/whoami", mgmtProxy)
	} else {
		// if we don't have a server host, we must be directly connected to cbqengine. We
		// need to intercept and handle messages to /pools/...

		http.HandleFunc("/pools", fakeServer)
		http.HandleFunc("/pools/default", fakeServer)
		http.HandleFunc("/pools/default/buckets", fakeServer)
		http.HandleFunc("/pools/default/checkPermissions", fakeServer)
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
	Statement       string       `json:"statement"`
	ClientContextId string       `json:"client_context_id"`
	Creds           []Credential `json:"creds"`
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

	//fmt.Printf(" Got query request encoding: %v\n", r.Header.Get("Content-Type"))

	// if we were given a USER/PASS, we need to insert them into the creds array
	// to give queries those privileges
	if USER != nil && len(*USER) > 0 && PASS != nil && len(*PASS) > 0 {
		r.SetBasicAuth(*USER, *PASS)
		// create a credentials array with USER and PASS
		var credentials []Credential = make([]Credential, 0, 0)
		newCred := new(Credential)
		newCred.User = *USER
		newCred.Pass = *PASS
		credentials = append(credentials, *newCred)

		//
		// do we have JSON params or URL encoded params?
		//

		if strings.EqualFold(r.Header.Get("Content-Type"), "application/json") {
			queryParams := new(QueryParams)
			err := json.NewDecoder(r.Body).Decode(&queryParams)
			if err != nil {
				log(fmt.Sprintf("Error decoding JSON body: %v\n", err))
				return
			} else {
				//log(fmt.Sprintf("Got statement: %s\n", queryParams.Statement))
				//log(fmt.Sprintf("Got client context: %s\n", queryParams.ClientContextId))
				//log(fmt.Sprintf("Got creds: %v\n", queryParams.Creds))
			}

			queryParams.Creds = append(queryParams.Creds, credentials...)

			newParamBytes, cerr := json.Marshal(queryParams)
			//log(fmt.Sprintf("Got new params: %s\n", string(newParamBytes)))
			if cerr != nil {
				log(fmt.Sprintf("Error marshalling new credentials %v\n", cerr))
			} else {
				newBody := string(newParamBytes)
				r.Body = ioutil.NopCloser(strings.NewReader(newBody))
				r.ContentLength = int64(len(newBody))
			}

			//log(fmt.Sprintf("Added creds, new bytes: %v\n", string(newParamBytes)))

			// URL encoded
		} else if strings.EqualFold(r.Header.Get("Content-Type"), "application/x-www-form-urlencoded") {
			body, err := ioutil.ReadAll(r.Body)
			if err != nil {
				log(fmt.Sprintf("Error parsing URL-encoded body: %v\n", err))
				return
			}
			values, err := url.ParseQuery(string(body))
			if err != nil {
				log(fmt.Sprintf("Error parsing URL-encoded body values: %v\n", err))
				return
			}
			stmt := values.Get("statement")
			cci := values.Get("client_context_id")
			creds := values.Get("creds")

			// creds is JSON, array of Credential
			var cred_array []Credential
			//log(fmt.Sprintf("Got creds bytes: %v\n", creds))
			if len(creds) > 0 {
				err = json.Unmarshal([]byte(creds), &cred_array)
				if err != nil {
					log(fmt.Sprintf("Error unmarshalling creds: %v\n", err))
					return
				}
				cred_array = append(cred_array, credentials...)
				creds_bytes, err := json.Marshal(cred_array)
				if err != nil {
					log(fmt.Sprintf("Error re-marshalling creds: %v\n", err))
					return
				}
				creds = string(creds_bytes)
				//log(fmt.Sprintf("Added u-creds, new bytes: %v\n", string(creds_bytes)))
			}

			data := url.Values{}
			data.Set("statement", stmt)
			data.Add("client_context_id", cci)
			data.Add("creds", creds)
			newBody := data.Encode()
			r.Body = ioutil.NopCloser(strings.NewReader(newBody))
			r.ContentLength = int64(len(newBody))
		}
	}

	//log(fmt.Sprintf("Got new request form: %v\n", r.PostForm))
	//log(fmt.Sprintf("Got new request: %v\n", r))
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
	//fmt.Printf(" pre toMgmt, host %v path %v\n  method: %v MethodGet %v\n\n", r.Host, r.URL.Path, r.Method, http.MethodGet)

	// for safely, we should only handle GET requests to pools and pools/default, and POST to checkPermissions
	if r.Method == http.MethodGet || (r.Method == http.MethodPost && r.URL.Path == "/pools/default/checkPermissions") {
		r.Host = serverHost
		r.URL.Host = r.Host
		r.URL.Scheme = "http"

		// if we have a login/password, use it for authorization
		if USER != nil && len(*USER) > 0 && PASS != nil && len(*PASS) > 0 {
			//fmt.Printf(" Setting user to %s and pass to %s\n",*USER,*PASS)
			r.SetBasicAuth(*USER, *PASS)
		}
		//fmt.Printf("   post toMgmt, host %v path %v\n\n", r.Host, r.URL.Path)
	} //else {
	//    fmt.Printf("   REJECTED!")
	//}
}

func fromMgmt(resp *http.Response) error {
	//fmt.Printf("Got response: %v\n", resp.Header)
	delete(resp.Header, "Www-Authenticate")
	//fmt.Printf("After got response: %v\n",resp.Header)
	return nil
}

func fakeServer(w http.ResponseWriter, r *http.Request) {
	if strings.EqualFold(r.URL.Path, "/pools") {
        fmt.Fprintf(w,"{\"isAdminCreds\":true,\"isROAdminCreds\":false,\"isEnterprise\":true,\"isIPv6\":false,\"pools\":[{\"name\":\"default\",\"uri\":\"/pools/default?uuid=a38cf241fd1dca5c4165ac385216ce98\",\"streamingUri\":\"/poolsStreaming/default?uuid=a38cf241fd1dca5c4165ac385216ce98\"}],\"settings\":{\"maxParallelIndexers\":\"/settings/maxParallelIndexers?uuid=a38cf241fd1dca5c4165ac385216ce98\",\"viewUpdateDaemon\":\"/settings/viewUpdateDaemon?uuid=a38cf241fd1dca5c4165ac385216ce98\"},\"uuid\":\"a38cf241fd1dca5c4165ac385216ce98\",\"implementationVersion\":\"0.0.0-0000-enterprise\",\"componentsVersion\":{\"public_key\":\"1.5.2\",\"inets\":\"6.5.2.4\",\"sasl\":\"3.1.2\",\"ale\":\"0.0.0-0000-enterprise\",\"crypto\":\"4.2.2.2\",\"lhttpc\":\"1.3.0\",\"os_mon\":\"2.4.4\",\"ns_server\":\"0.0.0-0000-enterprise\",\"ssl\":\"8.2.6.2\",\"kernel\":\"5.4.3.2\",\"asn1\":\"5.0.5.1\",\"stdlib\":\"3.4.5\"}}")
	} else if strings.EqualFold(r.URL.Path, "/pools/default") {
        fmt.Fprintf(w,"{ \"balanced\": false, \"buckets\": { \"terseBucketsBase\": \"/pools/default/b/\", \"terseStreamingBucketsBase\": \"/pools/default/bs/\", \"uri\": \"/pools/default/buckets?v=64942530&uuid=a38cf241fd1dca5c4165ac385216ce98\" }, \"cbasMemoryQuota\": 1791, \"checkPermissionsURI\": \"/pools/default/checkPermissions?v=af0ZJUIda2kjhckw2uArdg%2Fjzqk%3D\", \"clusterName\": \"\", \"counters\": { \"rebalance_start\": 1, \"rebalance_success\": 1 }, \"eventingMemoryQuota\": 256, \"ftsMemoryQuota\": 512, \"indexMemoryQuota\": 512, \"indexStatusURI\": \"/indexStatus?v=11215683\", \"maxBucketCount\": 10, \"memoryQuota\": 6013, \"name\": \"default\", \"nodeStatusesUri\": \"/nodeStatuses\", \"nodes\": [ { \"clusterCompatibility\": 393221, \"clusterMembership\": \"active\", \"couchApiBase\": \"http://127.0.0.1:9092/\", \"couchApiBaseHTTPS\": \"https://127.0.0.1:19092/\", \"cpuCount\": 4, \"hostname\": \"127.0.0.1:9091\", \"interestingStats\": { \"cmd_get\": 0, \"couch_docs_actual_disk_size\": 502368648, \"couch_docs_data_size\": 464684579, \"couch_spatial_data_size\": 0, \"couch_spatial_disk_size\": 0, \"couch_views_actual_disk_size\": 0, \"couch_views_data_size\": 0, \"curr_items\": 75934, \"curr_items_tot\": 75934, \"ep_bg_fetched\": 0, \"get_hits\": 0, \"mem_used\": 202033888, \"ops\": 0, \"vb_active_num_non_resident\": 0, \"vb_replica_curr_items\": 0 }, \"mcdMemoryAllocated\": 13107, \"mcdMemoryReserved\": 13107, \"memoryFree\": 5218476032, \"memoryTotal\": 17179869184, \"os\": \"x86_64-apple-darwin17.7.0\", \"otpNode\": \"n_0@127.0.0.1\", \"ports\": { \"direct\": 12210, \"httpsCAPI\": 19092, \"httpsMgmt\": 19091 }, \"recoveryType\": \"none\", \"services\": [ \"fts\", \"index\", \"kv\", \"n1ql\" ], \"status\": \"healthy\", \"systemStats\": { \"cpu_utilization_rate\": 22.22222222222222, \"mem_free\": 5218476032, \"mem_total\": 17179869184, \"swap_total\": 5368709120, \"swap_used\": 3903586304 }, \"thisNode\": true, \"uptime\": \"300174\", \"version\": \"0.0.0-0000-enterprise\" }, { \"clusterCompatibility\": 393221, \"clusterMembership\": \"active\", \"couchApiBase\": \"http://127.0.0.1:9192/\", \"couchApiBaseHTTPS\": \"https://127.0.0.1:19192/\", \"cpuCount\": 4, \"hostname\": \"127.0.0.1:9191\", \"interestingStats\": {}, \"mcdMemoryAllocated\": 13107, \"mcdMemoryReserved\": 13107, \"memoryFree\": 5220597760, \"memoryTotal\": 17179869184, \"os\": \"x86_64-apple-darwin17.7.0\", \"otpNode\": \"n_1@127.0.0.1\", \"ports\": { \"direct\": 12310, \"httpsCAPI\": 19192, \"httpsMgmt\": 19191 }, \"recoveryType\": \"none\", \"services\": [ \"cbas\", \"eventing\" ], \"status\": \"healthy\", \"systemStats\": { \"cpu_utilization_rate\": 37.78337531486146, \"mem_free\": 5220597760, \"mem_total\": 17179869184, \"swap_total\": 5368709120, \"swap_used\": 3903586304 }, \"uptime\": \"300174\", \"version\": \"0.0.0-0000-enterprise\" } ], \"rebalanceProgressUri\": \"/pools/default/rebalanceProgress\", \"rebalanceStatus\": \"none\", \"remoteClusters\": { \"uri\": \"/pools/default/remoteClusters?uuid=a38cf241fd1dca5c4165ac385216ce98\", \"validateURI\": \"/pools/default/remoteClusters?just_validate=1\" }, \"serverGroupsUri\": \"/pools/default/serverGroups?v=99375014\", \"stopRebalanceUri\": \"/controller/stopRebalance?uuid=a38cf241fd1dca5c4165ac385216ce98\", \"storageTotals\": { \"hdd\": { \"free\": 155021091349, \"quotaTotal\": 500068036608, \"total\": 500068036608, \"used\": 345046945259, \"usedByData\": 502368648 }, \"ram\": { \"quotaTotal\": 6305087488, \"quotaTotalPerNode\": 6305087488, \"quotaUsed\": 629145600, \"quotaUsedPerNode\": 629145600, \"total\": 11798970368, \"used\": 11449360384, \"usedByData\": 202033888 } }, \"tasks\": { \"uri\": \"/pools/default/tasks?v=57669170\" }}")
	} else if strings.EqualFold(r.URL.Path, "/pools/default/checkPermissions") {
	    fmt.Fprintf(w,"{\"cluster.bucket[.].n1ql.select!execute\":true,\"cluster.bucket[.].data.docs!upsert\":true,\"cluster.bucket[.].data.xattr!read\":true}")		
	}
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
