import MetadataDB from "./MetadataDB"

export class MetadataDBManager {
  public static metadataDB: MetadataDB

  public static getOrCreateMetadataDB() {
    if (!this.metadataDB) this.metadataDB = new MetadataDB()
    return this.metadataDB
  }

}
