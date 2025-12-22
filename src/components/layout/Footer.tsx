import { Link } from 'react-router-dom'

function Footer() {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    {
      name: 'Twitter/X',
      icon: '/social/twitter.svg',
      url: 'https://twitter.com/bitreserve',
    },
    {
      name: 'Discord',
      icon: '/social/discord.svg',
      url: 'https://discord.gg/bitreserve',
    },
    {
      name: 'GitHub',
      icon: '/social/github.svg',
      url: 'https://github.com/bitreserve/brs',
    },
  ]

  const quickLinks = [
    { name: 'About', path: '/about' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Data', path: '/explorer' },
  ]

  const resourceLinks = [
    { name: 'Docs', path: '/docs' },
    { name: 'Whitepaper', path: '/whitepaper' },
    { name: 'Technical Docs', path: '/technical-docs' },
  ]

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 transition-colors mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1">
            <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">Bitres</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Bitres - Mint BTD stablecoin with BTC collateral.
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map(social => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label={social.name}
                >
                  <img src={social.icon} alt={social.name} className="w-5 h-5 dark:invert" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map(link => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white">Resources</h4>
            <ul className="space-y-2">
              {resourceLinks.map(link => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Protocol */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white">Protocol</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Mint
                </Link>
              </li>
              <li>
                <Link
                  to="/farm"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Farm
                </Link>
              </li>
              <li>
                <Link
                  to="/stake"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Stake
                </Link>
              </li>
              <li>
                <Link
                  to="/swap"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Swap
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              (c) {currentYear} Bitres. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                to="/privacy"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
