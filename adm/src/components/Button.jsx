export default function Button({ variant = 'primary', className = '', type = 'button', children, ...props }) {
  return <button type={type} className={`ui-button ui-button--${variant} ${className}`.trim()} {...props}>{children}</button>;
}
