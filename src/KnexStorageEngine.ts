import makeMigrations from './makeMigrations'

/**
 * StorageEngine specifically implemented for Marketplace Lookup with Knex
 * TODO: Use Typescript interface to extend functionality of base class
 * Generic lookservice should return the topic as well as the txid and vout
 */
export class KnexStorageEngine {
  private knex
  private tablePrefix
  private migrations
  constructor({ knex, tablePrefix = 'marketplace_lookup_' }) {
    this.knex = knex
    this.tablePrefix = tablePrefix
    this.migrations = makeMigrations({ tablePrefix })
  }

  /**
   * Stores a new marketplace record
   * @param {object} obj all params given in an object
   * @param {string} obj.txid the transactionId of the transaction this UTXO is apart of
   * @param {Number} obj.vout index of the output
   */
  async storeRecord({
    txid,
    vout,
    proof,
    acceptedAssets,
    description,
    assetId,
    amount,
    seller
  }) {
    await this.knex(`${this.tablePrefix}market`).insert({
      txid,
      vout,
      proof,
      acceptedAssets,
      description,
      assetId,
      seller,
      amount
    })
  }

  /**
   * Deletes an existing marketplace record
   * @param {Object} obj all params given in an object
   */
  async deleteRecord({ txid, vout }) {
    await this.knex(`${this.tablePrefix}market`).where({
      txid,
      vout
    }).del()
  }

  /**
   * Look up a marketplace record by the txid and vout
   * @param {Object} obj params given in an object
   * @param {String} obj.txid UTXO's TXID
   * @param {Number} obj.vout UTXO's vout
   */
  async findByTxidVout({ txid, vout }) {
    return await this.knex(`${this.tablePrefix}market`).where({
      txid,
      vout
    }).select('txid', 'vout')
  }

  /**
   * Look up a marketplace record by the seller
   * @param {Object} obj params given in an object
   * @param {String} obj.seller the seller's identity key
   */
  async findBySeller({ seller }) {
    return await this.knex(`${this.tablePrefix}market`).where({
      seller
    }).select('txid', 'vout')
  }

  /**
   * Look up a marketplace record by the asset ID
   * @param {Object} obj params given in an object
   * @param {String} obj.assetId the asset ID you want to query
   */
  async findByAssetId({ assetId }) {
    return await this.knex(`${this.tablePrefix}market`).where({
      assetId
    }).select('txid', 'vout')
  }

  async findAll() {
    return await this.knex(`${this.tablePrefix}market`).select('txid', 'vout')
  }
}