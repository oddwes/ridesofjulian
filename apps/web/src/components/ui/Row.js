const Row = ({ header, columns, className = "" }) => {
  return (
    <div className={`flex items-center mx-4 w-full h-full grow ${className}`}>
      <div className="my-2 mr-4">
        {header}
      </div>
      <div className="grid grid-cols-7 justify-between w-11/12 h-full flex-1">
        {columns}
      </div>
    </div>
  )
}

export default Row 