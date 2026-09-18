use crate::{core::error::AppError, infra::db::Item};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateItemDto {
    pub title: String,
    pub content: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateItemDto {
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
}

pub async fn list_items(pool: &PgPool, limit: i64, offset: i64) -> Result<Vec<Item>, AppError> {
    let items = sqlx::query_as::<_, Item>(
        r#"
        SELECT id, title, content, tags, created_at, updated_at
        FROM items
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(AppError::Database)?;

    Ok(items)
}

pub async fn get_item(pool: &PgPool, id: Uuid) -> Result<Item, AppError> {
    let item = sqlx::query_as::<_, Item>(
        r#"
        SELECT id, title, content, tags, created_at, updated_at
        FROM items
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)?;

    Ok(item)
}

pub async fn create_item(pool: &PgPool, dto: CreateItemDto) -> Result<Item, AppError> {
    let item = sqlx::query_as::<_, Item>(
        r#"
        INSERT INTO items (title, content, tags)
        VALUES ($1, $2, $3)
        RETURNING id, title, content, tags, created_at, updated_at
        "#,
    )
    .bind(dto.title)
    .bind(dto.content)
    .bind(dto.tags)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)?;

    Ok(item)
}

pub async fn update_item(pool: &PgPool, id: Uuid, dto: UpdateItemDto) -> Result<Item, AppError> {
    let existing = get_item(pool, id).await?;

    let new_title = dto.title.unwrap_or(existing.title);
    let new_content = dto.content.or(existing.content);
    let new_tags = dto.tags.unwrap_or(existing.tags);

    let updated = sqlx::query_as::<_, Item>(
        r#"
        UPDATE items
        SET title = $1, content = $2, tags = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING id, title, content, tags, created_at, updated_at
        "#,
    )
    .bind(new_title)
    .bind(new_content)
    .bind(new_tags)
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(AppError::Database)?;

    Ok(updated)
}

pub async fn delete_item(pool: &PgPool, id: Uuid) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM items WHERE id = $1")
        .bind(id)
        .execute(pool)
        .await
        .map_err(AppError::Database)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("Item with id {id} not found")));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_item_dto_deserialization() {
        let json_data =
            r#"{"title":"Hackathon project","content":"Build an agent","tags":["ai","rust"]}"#;
        let dto: CreateItemDto = serde_json::from_str(json_data).unwrap();
        assert_eq!(dto.title, "Hackathon project");
        assert_eq!(dto.content, Some("Build an agent".to_string()));
        assert_eq!(dto.tags.len(), 2);
    }

    #[test]
    fn test_update_item_dto_partial() {
        let json_data = r#"{"title":"Updated title"}"#;
        let dto: UpdateItemDto = serde_json::from_str(json_data).unwrap();
        assert_eq!(dto.title, Some("Updated title".to_string()));
        assert!(dto.content.is_none());
        assert!(dto.tags.is_none());
    }
}
