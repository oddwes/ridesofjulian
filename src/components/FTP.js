"use client"

import { createContext, useContext, useState } from "react"

export const FtpContext = createContext(0)

const FTP = () => {
  const [ftp, setFtp] = useState(250)
  const ftpContext = useContext(FtpContext)

  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-gray-700">FTP:</label>
      <input
        type="number"
        value={ftp}
        onChange={(e) => setFtp(Number(e.target.value))}
        className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  )
}

export default FTP