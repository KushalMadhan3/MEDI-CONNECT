import React, { useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const handleError = () => {
    if (retryCount < 2 && props.src) {
      // Retry with a different approach
      setRetryCount(prev => prev + 1);
      return;
    }
    setDidError(true)
  }

  const { src, alt, style, className, ...rest } = props

  // Generate fallback placeholder if image fails
  const fallbackSrc = `https://via.placeholder.com/400x400/E8EAFF/3F53D9?text=${encodeURIComponent(alt || 'Image')}`

  return didError ? (
    <div
      className={`inline-block bg-gradient-to-br from-[#F5F3FA] to-[#E8EAFF] text-center align-middle flex items-center justify-center ${className ?? ''}`}
      style={style}
    >
      <div className="flex flex-col items-center justify-center w-full h-full p-4">
        <div className="w-16 h-16 rounded-full bg-[#3F53D9]/20 flex items-center justify-center mb-2">
          <span className="text-2xl">📷</span>
        </div>
        <span className="text-xs text-gray-500">{alt || 'Image'}</span>
      </div>
    </div>
  ) : (
    <img 
      src={src || fallbackSrc} 
      alt={alt} 
      className={className} 
      style={style} 
      {...rest} 
      onError={handleError}
      loading="lazy"
    />
  )
}
