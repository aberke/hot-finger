package main 

import (
	"os"
	"fmt"
	"log"
	"net/http"

    "github.com/aberke/readTouch/touches"
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
	
	http.HandleFunc("/static/", serveStatic)
	http.HandleFunc("/", serveHome)

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Error listening, %v", err)
    }
}

func serveHome(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./public/")
}
func serveStatic(w http.ResponseWriter, r *http.Request) {
	var staticFileHandler = http.FileServer(http.Dir("./public/"))
	staticFileHandler.ServeHTTP(w, r)
}