"use client"

const Row = ({ children, className = "" }) => {
  return (
    <div className={`flex mx-4 my-2 gap-36 w-full ${className}`}>
      {children}
    </div>
  )
}

export default Row 