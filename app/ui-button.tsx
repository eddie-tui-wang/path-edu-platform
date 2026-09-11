import type {ButtonHTMLAttributes} from 'react';

export function Button({className='',variant='secondary',type='button',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'danger'}) {
  return <button type={type} className={`ui-button ui-button-${variant} ${className}`} {...props}/>;
}
