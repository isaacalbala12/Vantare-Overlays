package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

func main() {
	base := "http://localhost:6397"
	endpoints := []string{
		"/rest/watch/standings",
		"/rest/watch/sessionInfo",
		"/navigation/state",
	}
	client := &http.Client{Timeout: 5 * time.Second}
	for _, ep := range endpoints {
		url := base + ep
		resp, err := client.Get(url)
		if err != nil {
			fmt.Printf("[ERR] %s: %v\n", ep, err)
			continue
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		fmt.Printf("==== %s ====\n", ep)
		var v any
		if err := json.Unmarshal(body, &v); err == nil {
			out, _ := json.MarshalIndent(v, "", "  ")
			fmt.Println(string(out))
		} else {
			fmt.Println(string(body))
		}
		fmt.Println()
	}
}
