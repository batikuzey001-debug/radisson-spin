// web/src/api/home.ts
import axios from "axios";
const API = import.meta.env.VITE_API_BASE_URL;

export type HomeBanner = {
  id: number;
  title?: string | null;
  subtitle?: string | null;
  image_url: string;
  order: number;
};

export async function getHomeBanners(): Promise<HomeBanner[]> {
  const { data } = await axios.get(`${API}/api/home/banners?active=true`);
  return data;
}
