interface ResetPasswordFormProps {
  readonly token: string;
  readonly email: string;
  readonly headingLevel: 1 | 2;
  onDone(email: string): void;
}

const ResetPasswordForm = (props: ResetPasswordFormProps) => {
  void props;
  throw new Error('ResetPasswordForm is not implemented');
};

export default ResetPasswordForm;
