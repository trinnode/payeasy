import { AlertCircle } from 'lucide-react';

interface FormErrorProps {
  message?: string;
}

const FormError = ({ message }: FormErrorProps) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-x-2 rounded-md bg-red-50 p-3 text-sm text-red-500 dark:bg-red-900/10 dark:text-red-400">
      <AlertCircle className="h-4 w-4" />
      <p>{message}</p>
    </div>
  );
};

export default FormError;
