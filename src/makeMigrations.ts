export default ({ tablePrefix }) => ([{
  up: async knex => {
    await knex.schema.createTable(`${tablePrefix}market`, table => {
      table.string('txid')
      table.integer('vout')
      table.string('proof', 'longtext')
      table.string('acceptedAssets', 'longtext')
      table.string('description', 'longtext')
      table.string('assetId')
      table.string('seller')
      table.integer('amount')
    })
  },
  down: async knex => {
    await knex.schema.dropTable(`${tablePrefix}market`)
  }
}])
