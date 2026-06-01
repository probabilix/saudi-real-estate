import { CloudinaryService } from '../services/cloudinary.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  const url = "https://docs.google.com/uc?export=download&id=1qWEMGppNtz0xsh9lCkZciXJ63a3j0nuB";
  console.log("Uploading url:", url);
  const res = await CloudinaryService.uploadFromUrl(url);
  console.log("Result:", res);
}

test().catch(console.error);
