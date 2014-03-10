package main 

import (
	"os"
	"fmt"
	"log"
	"net/http"
	"time"
	"strconv"

    "github.com/aberke/hot-finger/touches"
)


const DEFAULT_PORT = "8080";

func main() {

	var port = os.Getenv("PORT")
	if len(port) == 0 {
		fmt.Println("$PORT not set -- defaulting to", DEFAULT_PORT)
		port = DEFAULT_PORT
	}
	fmt.Println("using port:", port)

	server := touches.NewServer()
	go server.Listen()
	
	http.HandleFunc("/new-grid-id", getNewGridId)
	http.HandleFunc("/static/", serveStatic)
	http.HandleFunc("/widget/", serveStatic)
	http.HandleFunc("/widget.js", serveWidget)
	http.HandleFunc("/", serveHome)

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Error listening, %v", err)
    }
}

var lastNewGridId int64 = 0
func getNewGridId(w http.ResponseWriter, r *http.Request) {
	newGridId := time.Now().UnixNano()
	if (newGridId == lastNewGridId) {
		newGridId = newGridId + 1
	}
	lastNewGridId = newGridId
	fmt.Fprintf(w, strconv.FormatInt(newGridId, 10))
}


func serveHome(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./public/")
}
func serveWidget(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./public/widget/hot-finger-widget.js")
}
func serveStatic(w http.ResponseWriter, r *http.Request) {
	var staticFileHandler = http.FileServer(http.Dir("./public/"))
	staticFileHandler.ServeHTTP(w, r)
}