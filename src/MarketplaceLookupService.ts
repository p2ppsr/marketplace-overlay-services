import pushdrop from 'pushdrop'
import { LookupService } from 'confederacy-base'
import { KnexStorageEngine } from './KnexStorageEngine'

/**
 * Implements a lookup service for marketplace
 * @public
 */
export class MarketplaceLookupService implements LookupService {
  public storageEngine: KnexStorageEngine
  public topics: String[]

  constructor({ storageEngine, topics = [] }) {
    this.storageEngine = storageEngine
    this.topics = topics
  }

  /**
   * Notifies the lookup service of a new output added.
   * @param {Object} obj all params are given in an object
   * @param {string} obj.txid the transactionId of the transaction this UTXO is apart of
   * @param {Number} obj.vout index of the output
   * @param {Buffer} obj.outputScript the outputScript data for the given UTXO
   * @returns {string} indicating the success status
   */
  async outputAdded({ txid, vout, outputScript, topic }) {
    if (!this.topics.includes(topic)) return
    // Decode the KVStore fields from the Bitcoin outputScript
    const result = pushdrop.decode({
      script: outputScript.toHex(),
      fieldFormat: 'buffer'
    })

    const proofString = result.fields[0].toString('utf8')
    const parsedProof = JSON.parse(proofString)
    // Store marketplace fields in the StorageEngine
    await this.storageEngine.storeRecord({
      txid,
      vout,
      seller: parsedProof.prover,
      amount: parsedProof.amount,
      proof: proofString,
      assetId: parsedProof.assetId,
      description: result.fields[2],
      acceptedAssets: result.fields[1],
    })
  }

  /**
   * Deletes the output record once the UTXO has been spent
   * @param {ob} obj all params given inside an object
   * @param {string} obj.txid the transactionId the transaction the UTXO is apart of
   * @param {Number} obj.vout the index of the given UTXO
   * @param {string} obj.topic the topic this UTXO is apart of
   * @returns
   */
  async outputSpent({ txid, vout, topic }) {
    if (!this.topics.includes(topic)) return
    await this.storageEngine.deleteRecord({ txid, vout })
  }

  /**
   * Finds marketplace records
   * @param {object} obj all params given in an object
   * @param {object} obj.query lookup query given as an object
   * @returns {object} with the data given in an object
   */
  async lookup({ query }) {
    // Validate Query
    if (!query) {
      const e = new Error('Lookup must include a valid query!')
      throw e
    }
    if (typeof query.txid !== 'undefined' &&
      typeof query.vout !== 'undefined') {
      return await this.storageEngine.findByTxidVout({
        txid: query.txid,
        vout: query.vout
      })
    } else if (query.findAll === 'true') {
      return await this.storageEngine.findAll()
    } else if (query.seller) {
      return await this.storageEngine.findBySeller({ seller: query.seller })
    } else if (query.assetId) {
      return await this.storageEngine.findByAssetId({ assetId: query.assetId })
    } else {
      const e = new Error('Query parameters must include either a txid + vout or "findAll = \'true\'".')
      throw e
    }
  }
}
