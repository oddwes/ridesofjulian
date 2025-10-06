"use client"

const Row = ({ header, columns, className = "" }) => {
  return (
    <div className={`flex items-center mx-4 my-2 w-full ${className}`}>
      <div className="min-w-34">
        {header}
      </div>
      <div className="grid grid-cols-7 justify-between w-11/12">
        {columns}
      </div>
    </div>
  )
}

export default Row 