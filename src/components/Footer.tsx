import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className="w-full py-4 px-6 mt-8 text-center text-sm text-gray-500 bg-base-200">
      <div className="flex flex-col md:flex-row justify-center gap-4 items-center">
        <a href="/privacy" className="hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded">Privacy Policy</a>
        <a href="/terms" className="hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded">Terms of Service</a>
        <a href="mailto:joanaponder@gmail.com" className="hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded">Contact</a>
        <a href="https://ko-fi.com/X8X71I3AQ6" target="_blank" rel="noopener noreferrer" className="inline-flex items-center" title="Buy Me a Coffee at ko-fi.com">
          <img height="25" style={{ border: 0, height: 25 }} src="https://storage.ko-fi.com/cdn/kofi2.png?v=6" alt="Buy Me a Coffee at ko-fi.com" />
        </a>
      </div>
      <div className="mt-2">&copy; {new Date().getFullYear()} Backlog Explorer</div>
    </footer>
  )
}

export default Footer
