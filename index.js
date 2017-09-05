'use strict'

const qs = require('querystring')
const moment = require('moment-timezone')

const request = require('./lib/request')
const parse = require('./lib/parse')
const compareJourney = require('./lib/compare-journey')
const {showDetails} = require('./lib/helpers')

const convertDate = (d) => {
	return moment.tz(+new Date(d), 'Europe/Berlin').locale('de')
}

const link = (query) => {
	// todo: rename return -> returning
	const {outbound, return: returning} = query
	if (!outbound) throw new Error('missing trip')

	const oDeparture = convertDate(outbound.departure)
	const rDeparture = returning ? convertDate(returning.departure) : null

	const req = {
		seqnr: '1',
		S: query.from.name,
		REQ0JourneyStopsSID: 'L=00' + query.from.id,
		Z: query.to.name,
		REQ0JourneyStopsZID: 'L=00' + query.to.id,
		date: oDeparture.format('dd, DD.MM.YY'),
		time: oDeparture.format('HH:mm'),
		returnDate: rDeparture ? rDeparture.format('dd, DD.MM.YY') : '',
		returnTime: rDeparture ? rDeparture.format('HH:mm') : '',
		existOptimizePrice: '1',
		country: 'DEU',
		start: '1',
		REQ0JourneyStopsS0A: '1',
		timesel: 'depart',
		returnTimesel: 'depart',
		optimize: '0',
		auskunft_travelers_number: '1',
		'tariffTravellerType.1': 'E',
		'tariffTravellerReductionClass.1': '2',
		tariffClass: '2', // todo
		rtMode: 'DB-HYBRID',
		HWAI: showDetails(false)
	}

	const onOutbound = ({data, cookies}) => {
		let outbound = parse(query, false)(data)

		outbound = outbound.find((f) => compareJourney(query, f.journey, false))
		if (!outbound) throw new Error('no matching outbound journey found')

		return request(outbound.nextStep, null, cookies)
	}

	const onReturning = ({data}) => {
		let returning = parse(query, true)(data)

		returning = returning.find((f) => compareJourney(query, f.journey, true))
		if (!returning) throw new Error('no matching returning journey found')

		return returning.nextStep
	}

	return request('https://reiseauskunft.bahn.de/bin/query.exe/dn', req)
	.then(onOutbound)
	.then(onReturning)
}

module.exports = link
