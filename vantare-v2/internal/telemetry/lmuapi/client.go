package lmuapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
}

func NewClient(baseURL string, timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = 750 * time.Millisecond
	}
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: timeout},
	}
}

func (c *Client) Standings() ([]StandingRow, error) {
	var rows []StandingRow
	if err := c.getJSON("/rest/watch/standings", &rows); err != nil {
		return nil, err
	}
	return rows, nil
}

func (c *Client) SessionInfo() (*SessionInfo, error) {
	var info SessionInfo
	if err := c.getJSON("/rest/watch/sessionInfo", &info); err != nil {
		return nil, err
	}
	return &info, nil
}

func (c *Client) getJSON(path string, out any) error {
	resp, err := c.http.Get(c.baseURL + path)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("lmu api %s: HTTP %d", path, resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}
