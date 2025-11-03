"use client"

import { createContext, useState, useContext } from "react"

export const FtpContext = createContext({ ftp: undefined, setFtp: () => {} })

export const FTPProvider = ({ children }) => {
  const [ftp, setFtp] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('ftp')
      return saved ? Number(saved) : undefined
    }
    return undefined
  })

  const updateFtp = (newFtp) => {
    setFtp(newFtp)
    sessionStorage.setItem('ftp', newFtp.toString())
  }

  return (
    <FtpContext.Provider value={{ ftp, setFtp: updateFtp }}>
      {children}
    </FtpContext.Provider>
  )
}

export const FTPInput = () => {
  const { ftp, setFtp } = useContext(FtpContext)

  const handleFtpChange = (e) => {
    setFtp(Number(e.target.value))
  }

  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-gray-700">FTP:</label>
      <input
        type="number"
        value={ftp || ''}
        onChange={handleFtpChange}
        className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  )
}

export default FTPProvider