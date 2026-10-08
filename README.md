# 🎵 ChordNote – The Ultimate Online Chord Sheet Editor

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev/)
[![jsPDF](https://img.shields.io/badge/jsPDF-2.5-EA5C2B?logo=javascript)](https://github.com/parallax/jsPDF)
[![JSZip](https://img.shields.io/badge/JSZip-3.10-FFCC00?logo=javascript)](https://github.com/Stuk/jszip)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare)](https://pages.cloudflare.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Create, edit, transpose, and share chord sheets online for free.**  
ChordNote is the ultimate tool for musicians, songwriters, and worship leaders. Supports Nashville Numbers, Roman numerals, and real-time transposition.

🔗 **Live Demo**: [chordnote.me](https://chordnote.me)

---

## ✨ Features

- **🎸 Real-time Transposition** – Transpose your entire song instantly with a single click.
- **📝 Lyrics & Chords Editor** – Dual-panel interface for writing lyrics and adding chords simultaneously.
- **📊 Multiple Notations** – Switch between standard letters, **Nashville Numbers** (1, 4, 5), and **Roman numerals** (I, IV, V).
- **🔗 Shareable Links** – Generate compressed share URLs to send your charts to anyone.
- **🌐 URL Import** – Paste a song link from a supported chord site (or plain chord text) and import it automatically. Powered by a Cloudflare Pages Function with modular, per-site parsers.
- **🖨️ Preview & Export** – Export and download your own customized charts to JPEG/PNG/PDF.
- **💾 Auto-Save & Library** – Your work auto-saves to local storage. Save your work to a built-in library.

---

## 🛠️ Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 5 |
| **Styling** | CSS-in-JS with dynamic theming |
| **URL Compression** | `lz-string` (compact share URLs) |
| **Security** | `DOMPurify` (sanitizes all user input) |
| **PDF Generation** | `jsPDF` (export charts) |
| **ZIP Archiving** | `jszip` (batch exports) |
| **Icons** | `lucide-react` |
| **Deployment** | Cloudflare Pages (private GitHub repo) |

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/zanjzz/chordnote.git
   cd chordnote
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to:
   ```
   http://localhost:5173
   ```
   
---

## 📬 Contact

- **Project Link**: [https://github.com/zanjzz/chordnote](https://github.com/zanjzz/chordnote)
- **Live Site**: [https://chordnote.me](https://chordnote.me)

---

> Built with ❤️ for musicians everywhere.