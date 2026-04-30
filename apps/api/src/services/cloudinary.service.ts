import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export class CloudinaryService {
  /**
   * Generates a signed upload signature for frontend direct upload
   * This is more secure than unsigned uploads and avoids passing large files through our server
   */
  static getSignedUploadParams(folder: string = 'listings') {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const upload_preset = 'saudi_re_listing'; // The preset you just created
    
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: `saudi-re/${folder}`,
        upload_preset,
      },
      process.env.CLOUDINARY_API_SECRET!
    );

    return {
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder: `saudi-re/${folder}`,
      upload_preset,
    };
  }

  /**
   * Optional: Helper to delete images if a listing is deleted or images are removed
   */
  static async deleteImage(publicId: string) {
    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      console.error('Cloudinary Delete Error:', error);
      return false;
    }
  }
}
