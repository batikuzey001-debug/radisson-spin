// web/src/api/site.ts
import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL;

export type HeaderConfig = {
  logo_url: string;         // boş olabilir (admin doldurunca dolacak)
  login_cta_text: string;   // default: "Giriş"
  login_cta_url: string;    // boş olabilir
};

export async function getHeaderConfig(): Promise<HeaderConfig> {
  const { data } = await axios.get(`${API}/api/site/header`);
  return data as HeaderConfig;
}
