import { Github, Linkedin } from 'lucide-react'

/** Quiet credit line with the author's links. */
export default function Footer() {
  return (
    <footer className="footer">
      <p className="footer-credit">Built by Valentina Varela Alzate</p>
      <div className="footer-links">
        <a href="https://github.com/Valentina17varela" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile">
          <Github size={18} aria-hidden />
        </a>
        <a href="https://www.linkedin.com/in/valentinavarelaalzate/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">
          <Linkedin size={18} aria-hidden />
        </a>
      </div>
    </footer>
  )
}
