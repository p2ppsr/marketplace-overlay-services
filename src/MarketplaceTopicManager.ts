import pushdrop from 'pushdrop'
import { AdmissableOutputs, Output, TopicManager, Transaction } from 'confederacy-base'
import { getPaymentAddress } from 'sendover'
import { PrivateKey } from '@bsv/sdk'
import { BTMS } from 'btms-core'

const ANYONE = '0000000000000000000000000000000000000000000000000000000000000001'

/**
 * Implements a topic manager for marketplace management
 * @public
 */
export class MarketplaceTopicManager implements TopicManager {
  confederacyHost: string
  peerServHost: string
  messageBox: string
  protocolID: string
  basket: string
  topic: string
  satoshis: number
  privateKey: string

  constructor(
    confederacyHost = 'https://confederacy.babbage.systems',
    peerServHost = 'https://peerserv.babbage.systems',
    messageBox = 'marketplace-box',
    protocolID = 'marketplace',
    basket = 'marketplace',
    topic = 'marketplace',
    satoshis = 1000,
    privateKey = ANYONE
  ) {
    this.confederacyHost = confederacyHost
    this.peerServHost = peerServHost
    this.messageBox = messageBox
    this.protocolID = protocolID
    this.basket = basket
    this.topic = topic
    this.satoshis = satoshis
    this.privateKey = privateKey
  }

  /**
   * Returns the outputs from the transaction that are admissible.
   * @public
   * @param object - all params given in an object
   * @param previousUTXOs - any previous UTXOs
   * @param parsedTransaction - transaction containing outputs to admit into the current topic
   * @returns 
   */
  async identifyAdmissibleOutputs({ parsedTransaction }: { previousUTXOs: Output[]; parsedTransaction: Transaction }): Promise<number[] | AdmissableOutputs> {
    try {
      const outputsToAdmit: number[] = []

      for (const [outputIndex, output] of parsedTransaction.outputs.entries()) {
        try {
          const parsedToken = pushdrop.decode({
            script: output.script.toHex(),
            fieldFormat: 'buffer'
          })
          const parsedProof = JSON.parse(parsedToken.fields[0].toString('utf8'))

          // Ensure result.lockingPublicKey came from prover
          const expected = getPaymentAddress({
            senderPrivateKey: ANYONE,
            recipientPublicKey: parsedProof.prover,
            invoiceNumber: '2-marketplace-1',
            returnType: 'publicKey'
          })
          console.log('claimed key', parsedToken.fields[1].toString('hex'))
          console.log('expected child', expected)
          console.log('actual child', parsedToken.lockingPublicKey)
          if (expected !== parsedToken.lockingPublicKey) {
            const e = new Error('Unable to verify identity public key links to signing key')
            console.error('Rejecting output for ownership proof mismatch')
            throw e
          }

          // Verify proof is for anyone
          const anyonePub = new PrivateKey(ANYONE, 'hex').toPublicKey().toString()
          if (parsedProof.verifier !== anyonePub) {
            const e = new Error('Proof not for anyone')
            console.error('Rejecting output for not proving to anyone')
            throw e
          }

          // Verify proof is valid
          const btms = new BTMS(
            this.confederacyHost,
            this.peerServHost,
            this.messageBox,
            this.protocolID,
            this.basket,
            this.topic,
            this.satoshis
            // this.privateKey
          )
          const proofValid = await btms.verifyOwnership(parsedProof)
          if (!proofValid) {
            const e = new Error('Invalid asset ownership proof')
            console.error('Rejecting output for having an invalid asset ownership proof')
            throw e
          }

          // Verify desired asset list structure
          // an object whose keys are asset IDs and whose values are numbers
          const parsedDesiredAssets = JSON.parse(parsedToken.fields[1].toString('utf8'))
          for (const key of Object.keys(parsedDesiredAssets)) {
            const validAssetId = btms.validateAssetId(key)
            if (!validAssetId) {
              const e = new Error('Assset ID in desired assets structure invalid')
              console.error('Rejecting output for having an invalid asset ID in desired assets')
              throw e
            }
          }
          for (const val of Object.values(parsedDesiredAssets)) {
            if (typeof val !== 'number' || val < -1 || !Number.isInteger(val)) {
              const e = new Error('Amount in desired assets structure invalid')
              console.error('Rejecting output for having an invalid amount in desired assets')
              throw e
            }
          }

          outputsToAdmit.push(outputIndex)

        } catch (e) {
          continue
        }
      }
      return {
        outputsToAdmit,
        outputsToRetain: []
      }
    } catch (error) {
      return {
        outputsToAdmit: [],
        outputsToRetain: []
      }
    }
  }

  /**
   * Returns the documentation for the marketplace protocol
   */
  async getDocumentation(): Promise<string> {
    return `# Marketplace Protocol

    - A user wants to sell stuff
    - A user wants to find things for sale
    - A user wants to contact the seller
    - A user wants to make an offer
    - A user wants to accept an offer
    - The amount of things to sell is important
    - The things I might be willing to accept are important
    - People need a way to contact me and send me their ofers
    - Then we can do the actual exchange off-chain
    - Signed transactions are then registered with token-overlay-services
    - Thus, this is just to let people find each other
    
    Fields:
    1. a JSON-stringified asset ownership proof by the seller for anyone
    2. A list of what asset IDs they are willing to accept, with optional amount
    3. A markdown description of the items being listed for sale (optional)
    
    Validation rules:
    1. Ownership of PushDrop token must be held by the seller
    2. Ownership proof must be for anyone to verify
    3. Ownership proof must actually be valid
    4. List of assets must be correct structure`
  }
}