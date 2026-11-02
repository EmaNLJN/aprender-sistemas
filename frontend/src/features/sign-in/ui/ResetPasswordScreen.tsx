interface ResetPasswordScreenProps {
  readonly token: string;
  readonly email: string | null;
  readonly headingLevel: 1 | 2;
  onDone(email: string): void;
}

const ResetPasswordScreen = (props: ResetPasswordScreenProps) => {
  void props;
  throw new Error('ResetPasswordScreen is not implemented');
};

export default ResetPasswordScreen;
