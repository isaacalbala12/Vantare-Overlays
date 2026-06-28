package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestWriteFileIfChangedSkipsIdenticalContent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "version.txt")
	if err := os.WriteFile(path, []byte("0.3.10.0\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	oldTime := time.Now().Add(-1 * time.Hour)
	if err := os.Chtimes(path, oldTime, oldTime); err != nil {
		t.Fatal(err)
	}
	before, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}

	if err := writeFileIfChanged(path, []byte("0.3.10.0\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if !info.ModTime().Equal(before.ModTime()) {
		t.Fatalf("mtime changed for identical content: got %s want %s", info.ModTime(), before.ModTime())
	}
}

func TestWriteFileIfChangedWritesDifferentContent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "version.txt")
	if err := os.WriteFile(path, []byte("0.3.10.0\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	oldTime := time.Now().Add(-1 * time.Hour)
	if err := os.Chtimes(path, oldTime, oldTime); err != nil {
		t.Fatal(err)
	}

	if err := writeFileIfChanged(path, []byte("0.3.10.1\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "0.3.10.1\n" {
		t.Fatalf("content=%q, want updated version", got)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if !info.ModTime().After(oldTime) {
		t.Fatalf("mtime did not advance after content change: got %s old %s", info.ModTime(), oldTime)
	}
}
