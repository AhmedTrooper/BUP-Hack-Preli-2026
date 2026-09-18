use crate::core::{config::Config, error::AppError};
use aws_config::BehaviorVersion;
use aws_sdk_s3::{
    Client,
    config::{Credentials, Region},
    presigning::PresigningConfig,
    primitives::ByteStream,
};
use std::time::Duration;

#[derive(Clone)]
pub struct S3Service {
    client: Client,
    pub default_bucket: String,
}

impl S3Service {
    pub async fn new(config: &Config) -> Self {
        let credentials = Credentials::new(
            &config.s3_access_key,
            &config.s3_secret_key,
            None,
            None,
            "custom_credentials",
        );

        let region = Region::new(config.s3_region.clone());

        let mut s3_config_builder = aws_sdk_s3::config::Builder::new()
            .behavior_version(BehaviorVersion::latest())
            .region(region)
            .credentials_provider(credentials)
            .force_path_style(config.s3_force_path_style);

        if let Some(ref endpoint) = config.s3_endpoint {
            s3_config_builder = s3_config_builder.endpoint_url(endpoint);
        }

        let s3_config = s3_config_builder.build();
        let client = Client::from_conf(s3_config);

        Self {
            client,
            default_bucket: config.s3_bucket.clone(),
        }
    }

    pub async fn ensure_bucket(&self, bucket: &str) -> Result<(), AppError> {
        let exists = self.client.head_bucket().bucket(bucket).send().await;
        if exists.is_err() {
            tracing::info!("Bucket '{}' not found, creating it...", bucket);
            self.client
                .create_bucket()
                .bucket(bucket)
                .send()
                .await
                .map_err(|e| AppError::S3(format!("Failed to create bucket: {e}")))?;
        }
        Ok(())
    }

    pub async fn upload_object(
        &self,
        bucket: &str,
        key: &str,
        data: Vec<u8>,
        content_type: Option<&str>,
    ) -> Result<(), AppError> {
        let byte_stream = ByteStream::from(data);
        let mut req = self
            .client
            .put_object()
            .bucket(bucket)
            .key(key)
            .body(byte_stream);

        if let Some(ct) = content_type {
            req = req.content_type(ct);
        }

        req.send()
            .await
            .map_err(|e| AppError::S3(format!("Failed to upload object: {e}")))?;

        Ok(())
    }

    pub async fn get_object(&self, bucket: &str, key: &str) -> Result<Vec<u8>, AppError> {
        let resp = self
            .client
            .get_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await
            .map_err(|e| AppError::S3(format!("Failed to fetch object: {e}")))?;

        let bytes = resp
            .body
            .collect()
            .await
            .map_err(|e| AppError::S3(format!("Failed to read object body: {e}")))?
            .into_bytes();

        Ok(bytes.to_vec())
    }

    pub async fn delete_object(&self, bucket: &str, key: &str) -> Result<(), AppError> {
        self.client
            .delete_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await
            .map_err(|e| AppError::S3(format!("Failed to delete object: {e}")))?;

        Ok(())
    }

    pub async fn list_objects(
        &self,
        bucket: &str,
        prefix: Option<&str>,
    ) -> Result<Vec<String>, AppError> {
        let mut req = self.client.list_objects_v2().bucket(bucket);
        if let Some(p) = prefix {
            req = req.prefix(p);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| AppError::S3(format!("Failed to list objects: {e}")))?;

        let keys = resp
            .contents
            .unwrap_or_default()
            .into_iter()
            .filter_map(|obj| obj.key)
            .collect();

        Ok(keys)
    }

    pub async fn generate_presigned_download_url(
        &self,
        bucket: &str,
        key: &str,
        expires_in_secs: u64,
    ) -> Result<String, AppError> {
        let presigning_config = PresigningConfig::expires_in(Duration::from_secs(expires_in_secs))
            .map_err(|e| AppError::S3(format!("Invalid presigning duration: {e}")))?;

        let presigned_req = self
            .client
            .get_object()
            .bucket(bucket)
            .key(key)
            .presigned(presigning_config)
            .await
            .map_err(|e| AppError::S3(format!("Failed to presign URL: {e}")))?;

        Ok(presigned_req.uri().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_s3_service_builder() {
        let config = Config::from_env();
        let service = S3Service::new(&config).await;
        assert_eq!(service.default_bucket, config.s3_bucket);
    }
}
