// Simple toast utility for student interface
export interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export const toast = ({ title, description, variant = 'default' }: ToastOptions) => {
  // Simple console log for now - in a real app this would show actual toast notifications
  const message = description ? `${title}: ${description}` : title
  if (variant === 'destructive') {
    console.error('Toast Error:', message)
  } else {
    console.log('Toast:', message)
  }
  
  // You could integrate with a real toast library like react-hot-toast here
  // For now, we'll just use browser alerts for important messages
  if (variant === 'destructive') {
    alert(`Error: ${message}`)
  }
}
