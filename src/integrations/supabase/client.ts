import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ebtrdchnfdamcvhkqbvi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_834MvWu1iauhUpCjOckvug_Sm6zbEfT";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
