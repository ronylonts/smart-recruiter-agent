import { useForm } from 'react-hook-form';

// Hook personnalisé pour la validation de formulaires avec react-hook-form
export const useFormValidation = <T extends Record<string, any>>(options?: any) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<T>(options);

  return {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    reset,
    watch,
    setValue,
  };
};

// Exemple d'utilisation :
// const { register, handleSubmit, errors } = useFormValidation<LoginFormData>();
