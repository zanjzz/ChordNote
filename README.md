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
- **🖨️ Preview & Export** – Print or export your charts to PDF with customizable fonts and columns.
- **📦 Batch Export** – Export multiple chord sheets as a single ZIP file for offline use.
- **💾 Auto-Save & Library** – Your work auto-saves to local storage. Save your favorite songs to a built-in library.
- **🎨 Dark Mode** – Easy on the eyes during late-night writing sessions.
- **🛡️ Secure by Design** – All user-generated content from share links is automatically sanitized to prevent XSS and phishing link injection.

---

## 🛠️ Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 5 |
| **Styling** | CSS-in-JS with dynamic theming |
| **State Management** | React Hooks (useState, useEffect, useRef) |
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

## 🔧 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server with HMR. |
| `npm run build` | Builds the app for production to the `dist` folder. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Runs ESLint to check for code issues. |

---

## 🌐 Deployment (Cloudflare Pages)

This project is configured for seamless deployment via **Cloudflare Pages**.

1. Push your code to a private GitHub repository.
2. Log in to your Cloudflare Dashboard.
3. Go to **Pages** > **Create a project** > **Connect to Git**.
4. Select your repository and set the build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**: (None required for basic setup)
5. Click **Save and Deploy**.

Every time you push to your main branch, Cloudflare automatically rebuilds and deploys your site.

---

## 🔒 Security (Important)

ChordNote handles user-generated content via shareable compressed URLs. To ensure the safety of all users and prevent misuse:

- **Input Sanitization**: All text fields (`title`, `author`, `lyrics`, `musicKey`, `capo`) passed through share links are sanitized using `DOMPurify` to strip malicious HTML and JavaScript.
- **Link Filtering**: A regex filter removes any plaintext `http://`, `https://`, or `www.` URLs from these fields, replacing them with `[link removed]` to prevent phishing attacks.
- **Google Safe Browsing**: These measures ensure ChordNote remains compliant with Google's Safe Browsing policies.

---

## 📁 Project Structure (Key Files)

```
src/
├── components/
│   ├── ChordSheetEditor.jsx   # Main application component
│   ├── LyricsPanel.jsx        # Lyrics input area
│   ├── ChordsPanel.jsx        # Chords input area
│   ├── PreviewModal/          # PDF/Print preview logic
│   └── ...
├── utils/
│   ├── chordTranspose.js      # Transposition logic
│   ├── nashvilleNumbers.js    # Nashville/Roman numeral conversion
│   ├── shareCodec.js          # LZ-string compression for share links
│   ├── canvasHelpers.js       # PDF generation (jsPDF)
│   └── exportHelpers.js       # ZIP bundling (jszip)
├── hooks/
│   └── useChordRealignment.js # Auto-sync lyrics and chords
└── constants/
    └── themes.js              # Light/Dark theme definitions
```

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve ChordNote:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.

---

## 🙏 Acknowledgements

- [React](https://reactjs.org/) & [Vite](https://vitejs.dev/) for the blazing fast dev experience.
- [lz-string](https://github.com/pieroxy/lz-string) for URL compression.
- [DOMPurify](https://github.com/cure53/DOMPurify) for keeping our users safe.
- [Lucide](https://lucide.dev/) for the beautiful icons.
- [jsPDF](https://github.com/parallax/jsPDF) for PDF exports.
- [JSZip](https://github.com/Stuk/jszip) for batch export archiving.

---

## 📬 Contact

- **Project Link**: [https://github.com/zanjzz/chordnote](https://github.com/zanjzz/chordnote)
- **Live Site**: [https://chordnote.me](https://chordnote.me)

---

> Built with ❤️ for musicians everywhere.