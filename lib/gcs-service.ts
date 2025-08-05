/**
 * Google Cloud Storage Service for Vehicle Images
 * Handles image upload, processing, and metadata management
 */

import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

interface ImageUploadOptions {
  vehicleId: string;
  imageType?: 'exterior' | 'interior' | 'engine' | 'documents' | 'other';
  isPrimary?: boolean;
  tags?: string[];
}

interface ImageProcessingResult {
  gcsUrl: string;
  gcsBucket: string;
  gcsPath: string;
  gcsFilename: string;
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  processedAt: Date;
}

class GCSService {
  private storage: Storage;
  private bucket: string;

  constructor() {
    // Initialize Google Cloud Storage
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'analog-medium-451706-m7',
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE || undefined,
      credentials: process.env.GOOGLE_CLOUD_CREDENTIALS 
        ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
        : undefined
    });
    
    this.bucket = process.env.GCS_BUCKET_NAME || 'garage-ai-images';
  }

  /**
   * Upload image from URL to Google Cloud Storage
   */
  async uploadImageFromUrl(
    imageUrl: string, 
    options: ImageUploadOptions
  ): Promise<ImageProcessingResult> {
    try {
      console.log(`📸 Uploading image from URL: ${imageUrl}`);

      // Download image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      return await this.uploadImageFromBuffer(imageBuffer, contentType, options, imageUrl);

    } catch (error) {
      console.error('Error uploading image from URL:', error);
      throw error;
    }
  }

  /**
   * Upload image from buffer to Google Cloud Storage
   */
  async uploadImageFromBuffer(
    imageBuffer: Buffer,
    contentType: string,
    options: ImageUploadOptions,
    originalUrl?: string
  ): Promise<ImageProcessingResult> {
    try {
      // Process image with Sharp for optimization and metadata
      const processedImage = await this.processImage(imageBuffer);
      
      // Generate unique filename with organized path structure
      const filename = this.generateFilename(options.vehicleId, options.imageType || 'other');
      const filePath = this.generateFilePath(options.vehicleId, filename);

      console.log(`☁️ Uploading to GCS: ${filePath}`);

      // Upload to Google Cloud Storage
      const file = this.storage.bucket(this.bucket).file(filePath);
      
      await file.save(processedImage.buffer, {
        metadata: {
          contentType: processedImage.format === 'jpeg' ? 'image/jpeg' : 'image/webp',
          metadata: {
            vehicleId: options.vehicleId,
            imageType: options.imageType || 'other',
            isPrimary: options.isPrimary?.toString() || 'false',
            tags: options.tags?.join(',') || '',
            originalUrl: originalUrl || '',
            uploadedAt: new Date().toISOString(),
            processedBy: 'garage-ai-system'
          }
        },
        public: true // Make images publicly accessible
      });

      // Generate public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucket}/${filePath}`;

      console.log(`✅ Image uploaded successfully: ${publicUrl}`);

      return {
        gcsUrl: publicUrl,
        gcsBucket: this.bucket,
        gcsPath: filePath,
        gcsFilename: filename,
        fileSize: processedImage.buffer.length,
        mimeType: processedImage.format === 'jpeg' ? 'image/jpeg' : 'image/webp',
        width: processedImage.info.width,
        height: processedImage.info.height,
        processedAt: new Date()
      };

    } catch (error) {
      console.error('Error uploading image to GCS:', error);
      throw error;
    }
  }

  /**
   * Process image for optimization
   */
  private async processImage(imageBuffer: Buffer) {
    try {
      // Process with Sharp for optimization
      const processed = await sharp(imageBuffer)
        .resize(1200, 800, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85,
          progressive: true 
        })
        .toBuffer({ resolveWithObject: true });

      return {
        buffer: processed.data,
        info: processed.info,
        format: 'jpeg'
      };

    } catch (error) {
      console.error('Error processing image:', error);
      // Return original buffer if processing fails
      const metadata = await sharp(imageBuffer).metadata();
      return {
        buffer: imageBuffer,
        info: { width: metadata.width || 0, height: metadata.height || 0 },
        format: 'jpeg'
      };
    }
  }

  /**
   * Generate organized file path structure
   */
  private generateFilePath(vehicleId: string, filename: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Structure: vehicles/YYYY/MM/vehicleId/filename
    return `vehicles/${year}/${month}/${vehicleId}/${filename}`;
  }

  /**
   * Generate unique filename
   */
  private generateFilename(vehicleId: string, imageType: string): string {
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    
    return `${imageType}_${timestamp}_${uniqueId}.jpg`;
  }

  /**
   * Delete image from Google Cloud Storage
   */
  async deleteImage(gcsPath: string): Promise<boolean> {
    try {
      const file = this.storage.bucket(this.bucket).file(gcsPath);
      await file.delete();
      
      console.log(`🗑️ Deleted image: ${gcsPath}`);
      return true;

    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  /**
   * Get image metadata from Google Cloud Storage
   */
  async getImageMetadata(gcsPath: string) {
    try {
      const file = this.storage.bucket(this.bucket).file(gcsPath);
      const [metadata] = await file.getMetadata();
      
      return {
        size: metadata.size,
        contentType: metadata.contentType,
        created: metadata.timeCreated,
        updated: metadata.updated,
        customMetadata: metadata.metadata
      };

    } catch (error) {
      console.error('Error getting image metadata:', error);
      return null;
    }
  }

  /**
   * List images for a specific vehicle
   */
  async listVehicleImages(vehicleId: string) {
    try {
      const prefix = `vehicles/`;
      const [files] = await this.storage.bucket(this.bucket).getFiles({
        prefix: prefix
      });

      // Filter files for specific vehicle
      const vehicleFiles = files.filter(file => 
        file.name.includes(`/${vehicleId}/`)
      );

      return vehicleFiles.map(file => ({
        name: file.name,
        url: `https://storage.googleapis.com/${this.bucket}/${file.name}`,
        size: file.metadata.size,
        created: file.metadata.timeCreated
      }));

    } catch (error) {
      console.error('Error listing vehicle images:', error);
      return [];
    }
  }

  /**
   * Bulk upload images for a vehicle
   */
  async uploadVehicleImages(
    imageUrls: string[],
    vehicleId: string,
    imageType: string = 'exterior'
  ): Promise<ImageProcessingResult[]> {
    console.log(`📦 Bulk uploading ${imageUrls.length} images for vehicle ${vehicleId}`);
    
    const results: ImageProcessingResult[] = [];
    const errors: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const result = await this.uploadImageFromUrl(imageUrls[i], {
          vehicleId,
          imageType: imageType as any,
          isPrimary: i === 0, // First image is primary
          tags: [`order-${i}`, imageType]
        });
        
        results.push(result);
        
        // Add delay between uploads to avoid rate limiting
        if (i < imageUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`Failed to upload image ${i + 1}:`, error);
        errors.push(`Image ${i + 1}: ${error}`);
      }
    }

    console.log(`✅ Bulk upload completed: ${results.length} successful, ${errors.length} failed`);
    
    if (errors.length > 0) {
      console.error('Upload errors:', errors);
    }

    return results;
  }

  /**
   * Generate signed URL for temporary access
   */
  async generateSignedUrl(gcsPath: string, expirationMinutes: number = 60): Promise<string> {
    try {
      const file = this.storage.bucket(this.bucket).file(gcsPath);
      
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + (expirationMinutes * 60 * 1000)
      });

      return signedUrl;

    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const gcsService = new GCSService();
export default gcsService;