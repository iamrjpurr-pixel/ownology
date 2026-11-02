// Secrets saved via the Emergent secrets card land in backend/.env (absent on Railway, so a no-op there).
import { config } from "dotenv";
config({ path: "backend/.env" });
