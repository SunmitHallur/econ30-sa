import { motion } from 'framer-motion'
import { FaChartLine } from 'react-icons/fa'
import styles from './App.module.css'

export default function App() {
  return (
    <motion.main
      className={styles.wrap}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <h1 className={styles.title}>
        <FaChartLine aria-hidden className={styles.icon} /> Econ 30 · React stack
      </h1>
      <p className={styles.lede}>
        This app uses <strong>React</strong>, <strong>framer-motion</strong>, and{' '}
        <strong>react-icons</strong>. Styles use a <strong>CSS Module</strong> (
        <code>App.module.css</code>) because <strong>Vite 8 + @vitejs/plugin-react v6</strong>{' '}
        no longer runs custom Babel plugins, so <strong>styled-jsx</strong>{' '}
        <code>&lt;style jsx&gt;</code> does not compile here. For styled-jsx, use{' '}
        <strong>Next.js</strong> (see <code>README.md</code>).
      </p>
    </motion.main>
  )
}
