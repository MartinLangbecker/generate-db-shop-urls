'use strict'

const test = require('tape')
const createHafas = require('db-hafas')
const {join} = require('path')
const {readFileSync} = require('fs')
const cheerio = require('cheerio')

const request = require('../lib/request')
const parse = require('../lib/parse')
const link = require('..')
const when = require('./when')

const koelnMainzOutbound = require('./hafas-koeln-mainz.json')
const koelnMainzHTML = readFileSync(join(__dirname, 'results-koeln-mainz.html'), {encoding: 'utf8'})
const koelnMainzExpected = require('./expected-koeln-mainz.json')

const berlin = '8011160'
const hamburg = '8002549'
const passau = '8000298'

const hafas = createHafas('generate-db-shop-urls test')

const isBookingPage = async (url) => {
	const {data} = await request(url, null, null)
	const $ = cheerio.load(data)
	const nextButton = $('.booking a[href]').get(0)
	const availContinueButton = $('#availContinueButton').get(0)
	// this is a really really brittle way to tell if the link generation
	// worked, hence if we're on the right page.
	// todo: find a more robust way, compare prices
	return nextButton || availContinueButton
}

test('parsing works Köln Hbf -> Mainz Hbf', (t) => {
	// TODO add result page with new layout, adjust outbound request and expected result
	const res = parse(koelnMainzOutbound, null, false)(koelnMainzHTML)
	t.deepEqual(res, koelnMainzExpected)
	t.end()
})

test('works Berlin Hbf -> Hamburg Hbf', {timeout: 10000}, async (t) => {
	const outbound = await hafas.journeys(berlin, hamburg, {
		departure: when.outbound, results: 1
	})
	const res = await link(outbound.journeys[0])
	t.ok(await isBookingPage(res), 'res is not a booking page link')
})

test('works Berlin Hbf -> Hamburg Hbf and back', {timeout: 10000}, async (t) => {
	const [outbound, returning] = await Promise.all([
		hafas.journeys(berlin, hamburg, {
			departure: when.outbound, results: 1
		}),
		hafas.journeys(hamburg, berlin, {
			departure: when.returning, results: 1
		})
	])
	const res = await link(outbound.journeys[0], {
		returning: returning.journeys[0],
	})
	t.ok(await isBookingPage(res), 'res is not a booking page link')
})

test('works Berlin Hbf -> Passau', {timeout: 10000}, async (t) => {
	const outbound = await hafas.journeys(berlin, passau, {
		departure: when.outbound, results: 1
	})
	const res = await link(outbound.journeys[0])
	t.ok(await isBookingPage(res), 'res is not a booking page link')
})
