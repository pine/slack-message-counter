'use strict'

const Promise = require('bluebird')
const sumBy = require('lodash.sumby')
const promiseRetry = require('promise-retry')
const { WebClient } = require('@slack/client')
const { sprintf } = require('sprintf-js')

// ----------------------------------------------------------------------------

const token = process.env.SLACK_API_TOKEN
if (!token) {
  console.error('Slack API token required')
  process.exit(1)
}

const web = new WebClient(token)

// ----------------------------------------------------------------------------

!async function () {
  const { channels } = await web.channels.list()
  const { groups } = await web.groups.list()

  const results = []
  await Promise.all(channels.map(({ name }) => promiseRetry(async () => {
    const { messages: { total } } = await web.search.messages(`in:#${name}`)
    results.push({ name, total })
  })))
  await Promise.all(groups.map(({ name }) => promiseRetry(async () => {
    const { messages: { total } } = await web.search.messages(`in:${name}`)
    results.push({ name, total })
  })))

  results.sort((a, b) => b.total - a.total)
  for (const result of results) {
    console.log(sprintf('%5d %s', result.total, result.name))
  }

  const sum = sumBy(results, result => result.total)
  console.log(`\nTotal: ${sum}`)
}()
