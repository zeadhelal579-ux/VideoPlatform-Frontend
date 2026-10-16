// File: ButtonLink.tsx
// Purpose: A router <Link> styled as a button. Use this instead of
// <Link><Button/></Link> — nesting a <button> inside an <a> is invalid HTML
// and doubles the keyboard tab stops (see Button.tsx).
import { Link, type LinkProps } from "react-router-dom";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./Button";

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// Router link styled as a button.
export function ButtonLink({ variant = "primary", size = "md", className = "", ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
