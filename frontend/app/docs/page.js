'use client';

import { useState } from 'react';
import Link from 'next/link';
import VSCodeBlock from '@/app/components/VSCodeBlock';

export default function DocsPage() {
  const [openLang, setOpenLang] = useState('nodejs');
  const [closeLang, setCloseLang] = useState('nodejs');

  // Open Result Code Snippets
  const openSnippets = {
    nodejs: `const express = require('express');
const app = express();

app.use(express.json());

// 1. Open Result Route
app.post('/api/open-result', (req, res) => {
  // Data coming in
  let { gameId, openPanel, openAnk } = req.body;

  // ------------------------------------
  // 2. USERS OWN LOGIC BELOW
  // ------------------------------------
  console.log('Game ID:', gameId);
  console.log('Open Result:', openPanel, openAnk);
  // (Save to database, send notifications, update UI, etc.)

  // 3. Return 200 OK
  res.status(200).send('OK');
});

app.listen(3000, () => console.log('Server running on port 3000'));`,

    python: `from flask import Flask, request

app = Flask(__name__)

# 1. Open Result Route
@app.route('/api/open-result', methods=['POST'])
def open_result():
    data = request.get_json()

    # Data coming in
    game_id = data.get('gameId')
    open_panel = data.get('openPanel')
    open_ank = data.get('openAnk')

    # ------------------------------------
    # 2. USERS OWN LOGIC BELOW
    # ------------------------------------
    print("Open Result:", game_id, open_panel, open_ank)
    # (Save to database, send notifications, etc.)

    # 3. Return 200 OK
    return "OK", 200

if __name__ == '__main__':
    app.run(port=3000)`,

    php: `<?php
// 1. Open Result Route
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // Data coming in
    $gameId    = $data['gameId'];
    $openPanel = $data['openPanel'];
    $openAnk   = $data['openAnk'];

    // ------------------------------------
    // 2. USERS OWN LOGIC BELOW
    // ------------------------------------
    // (Save to database, send notifications, etc.)

    // 3. Return 200 OK
    http_response_code(200);
    echo "OK";
}`,

    go: `package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type OpenData struct {
	GameID    interface{} \`json:"gameId"\`
	OpenPanel string      \`json:"openPanel"\`
	OpenAnk   string      \`json:"openAnk"\`
}

func main() {
	// 1. Open Result Route
	http.HandleFunc("/api/open-result", func(w http.ResponseWriter, r *http.Request) {
		var data OpenData
		json.NewDecoder(r.Body).Decode(&data)

		// Data coming in
		gameId := data.GameID
		openPanel := data.OpenPanel
		openAnk := data.OpenAnk

		// ------------------------------------
		// 2. USERS OWN LOGIC BELOW
		// ------------------------------------
		fmt.Printf("Open Result: Game %v: %s-%s\\n", gameId, openPanel, openAnk)

		// 3. Return 200 OK
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	http.ListenAndServe(":3000", nil)
}`,
  };

  // Close Result Code Snippets
  const closeSnippets = {
    nodejs: `const express = require('express');
const app = express();

app.use(express.json());

// 1. Close Result Route
app.post('/api/close-result', (req, res) => {
  // Data coming in
  let { gameId, closePanel, closeAnk } = req.body;

  // ------------------------------------
  // 2. USERS OWN LOGIC BELOW
  // ------------------------------------
  console.log('Game ID:', gameId);
  console.log('Close Result:', closePanel, closeAnk);
  // (Settle bets, update database, notify users, etc.)

  // 3. Return 200 OK
  res.status(200).send('OK');
});

app.listen(3000, () => console.log('Server running on port 3000'));`,

    python: `from flask import Flask, request

app = Flask(__name__)

# 1. Close Result Route
@app.route('/api/close-result', methods=['POST'])
def close_result():
    data = request.get_json()

    # Data coming in
    game_id = data.get('gameId')
    close_panel = data.get('closePanel')
    close_ank = data.get('closeAnk')

    # ------------------------------------
    # 2. USERS OWN LOGIC BELOW
    # ------------------------------------
    print("Close Result:", game_id, close_panel, close_ank)
    # (Settle bets, update database, etc.)

    # 3. Return 200 OK
    return "OK", 200

if __name__ == '__main__':
    app.run(port=3000)`,

    php: `<?php
// 1. Close Result Route
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // Data coming in
    $gameId     = $data['gameId'];
    $closePanel = $data['closePanel'];
    $closeAnk   = $data['closeAnk'];

    // ------------------------------------
    // 2. USERS OWN LOGIC BELOW
    // ------------------------------------
    // (Settle bets, update database, etc.)

    // 3. Return 200 OK
    http_response_code(200);
    echo "OK";
}`,

    go: `package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type CloseData struct {
	GameID     interface{} \`json:"gameId"\`
	ClosePanel string      \`json:"closePanel"\`
	CloseAnk   string      \`json:"closeAnk"\`
}

func main() {
	// 1. Close Result Route
	http.HandleFunc("/api/close-result", func(w http.ResponseWriter, r *http.Request) {
		var data CloseData
		json.NewDecoder(r.Body).Decode(&data)

		// Data coming in
		gameId := data.GameID
		closePanel := data.ClosePanel
		closeAnk := data.CloseAnk

		// ------------------------------------
		// 2. USERS OWN LOGIC BELOW
		// ------------------------------------
		fmt.Printf("Close Result: Game %v: %s-%s\\n", gameId, closePanel, closeAnk)

		// 3. Return 200 OK
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	http.ListenAndServe(":3000", nil)
}`,
  };

  const openTabs = [
    { id: 'nodejs', label: 'Node.js', filename: 'server.js', iconColor: '#f7df1e', langName: 'JavaScript', code: openSnippets.nodejs },
    { id: 'python', label: 'Python', filename: 'app.py', iconColor: '#3572A5', langName: 'Python', code: openSnippets.python },
    { id: 'php', label: 'PHP', filename: 'webhook.php', iconColor: '#777bb4', langName: 'PHP', code: openSnippets.php },
    { id: 'go', label: 'Go', filename: 'main.go', iconColor: '#00add8', langName: 'Go', code: openSnippets.go },
  ];

  const closeTabs = [
    { id: 'nodejs', label: 'Node.js', filename: 'server.js', iconColor: '#f7df1e', langName: 'JavaScript', code: closeSnippets.nodejs },
    { id: 'python', label: 'Python', filename: 'app.py', iconColor: '#3572A5', langName: 'Python', code: closeSnippets.python },
    { id: 'php', label: 'PHP', filename: 'webhook.php', iconColor: '#777bb4', langName: 'PHP', code: closeSnippets.php },
    { id: 'go', label: 'Go', filename: 'main.go', iconColor: '#00add8', langName: 'Go', code: closeSnippets.go },
  ];

  return (
    <div className="page animate-fade-in">
      <div className="container" style={{ maxWidth: '780px' }}>

        {/* Simple Page Header */}
        <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>
            API Setup Documentation
          </h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--fg-secondary)' }}>
            Follow these simple steps to set up your routes and receive live open and close market results.
          </p>
        </div>

        {/* Step 1: Open Result */}
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <span className="doc-step-badge">1</span>
            <h2 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>
              Open Result Route
            </h2>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-secondary)', marginBottom: 'var(--space-3)' }}>
            Create an open result route on your server. In that route, incoming JSON data is:
          </p>

          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
            let &#123; gameId, openPanel, openAnk &#125; = req.body;
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-tertiary)', marginBottom: 'var(--space-3)' }}>
            Add your own logic below the extracted data, and return HTTP status <code>200</code>.
          </p>

          {/* VS Code Block */}
          <VSCodeBlock
            tabs={openTabs}
            activeTab={openLang}
            onTabChange={setOpenLang}
          />
        </div>

        {/* Step 2: Close Result */}
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <span className="doc-step-badge">2</span>
            <h2 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>
              Close Result Route
            </h2>
          </div>

          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-secondary)', marginBottom: 'var(--space-3)' }}>
            Create a close result route on your server. In that route, incoming JSON data is:
          </p>

          <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
            let &#123; gameId, closePanel, closeAnk &#125; = req.body;
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-tertiary)', marginBottom: 'var(--space-3)' }}>
            Add your own logic below the extracted data, and return HTTP status <code>200</code>.
          </p>

          {/* VS Code Block */}
          <VSCodeBlock
            tabs={closeTabs}
            activeTab={closeLang}
            onTabChange={setCloseLang}
          />
        </div>

        {/* Step 3: Save Configuration */}
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <span className="doc-step-badge">3</span>
            <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>
              Save Your URLs in Dashboard
            </h2>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-secondary)', marginBottom: 'var(--space-4)' }}>
            Once your server is running, go to the Webhooks page and enter your Open and Close URLs.
          </p>

          <Link href="/dashboard/webhooks" className="btn btn-primary btn-sm">
            Go to Webhooks Configuration &rarr;
          </Link>
        </div>

        {/* Step 4: Check Result Success in Profile */}
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <span className="doc-step-badge">4</span>
            <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>
              Check Delivery Status in Your Profile
            </h2>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-secondary)', marginBottom: 'var(--space-4)' }}>
            After setting up your webhook, go to your <strong>Profile page</strong> to check whether your server received the results successfully or not:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', background: 'var(--bg-tertiary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span className="badge badge-success" style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                pass
              </span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-secondary)' }}>
                <strong>Success:</strong> Your webhook responded with HTTP <code>200 OK</code>.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span className="badge badge-error" style={{ background: 'var(--error-bg)', color: 'var(--error)', padding: '2px 8px', borderRadius: '4px', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                fail
              </span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-secondary)' }}>
                <strong>Failed:</strong> Server returned an error (4xx/5xx) or timed out (&gt;8s).
              </span>
            </div>
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--fg-tertiary)', marginBottom: 'var(--space-4)' }}>
            Look at the <strong>Available Markets</strong> table on your profile page to see the real-time status for each game.
          </p>

          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            Check Profile Page Status &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
}
