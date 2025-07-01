"use client"

import { forwardRef } from 'react'
import Link, { LinkProps } from 'next/link'
import { useTransitionRouter } from '@/components/providers/page-transition-provider'

interface TransitionLinkProps extends Omit<LinkProps, 'href'> {
  href: string
  children: React.ReactNode
  className?: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  ({ href, children, className, onClick, ...props }, ref) => {
    const { push } = useTransitionRouter()

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      
      // 커스텀 onClick 핸들러 실행
      if (onClick) {
        onClick(e)
      }
      
      // 페이지 전환
      push(href)
    }

    return (
      <Link
        ref={ref}
        href={href}
        className={className}
        onClick={handleClick}
        prefetch={true}
        {...props}
      >
        {children}
      </Link>
    )
  }
)

TransitionLink.displayName = 'TransitionLink'

export default TransitionLink 