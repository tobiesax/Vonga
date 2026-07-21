import SetPasswordForm from "./form";

export default function SetPasswordPage() {
  return <main className="loginPage"><div className="loginCard">
    <img src="/vonga/logo/vonga-logo.png" alt="VONGA"/>
    <p className="eyebrow">Merchant invitation</p>
    <h1>Set your password</h1>
    <p>Create a password to activate your Vonga merchant account.</p>
    <SetPasswordForm/>
  </div></main>;
}
