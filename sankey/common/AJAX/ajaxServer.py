#!/usr/bin/env python

from bottle import route, run, response

import sys
from pymongo import MongoClient
import cgi
from bson import ObjectId
from json import dumps

LRS_ID = "xxxxxxxxxxxxxxxxxxxxxxxx"

client = MongoClient()
db = client.learninglocker
try:
	statements = db.statements
except:
	print "Unable to connect to Mongo"



@route('/getCourses')
def getCourses():
	d = {}
	response.add_header('Access-Control-Allow-Origin', '*')

	result = statements.distinct("statement.context.contextActivities.grouping.definition.extensions.http://lrs&46;learninglocker&46;net/define/extensions/moodle_course.id", 
		{'lrs_id': ObjectId(LRS_ID)}
	)
	for cid in result:
		if (cid == 1): continue # Skip the site
		
		# Pull Course info for this single unit
		innerResult = statements.find({"statement.context.contextActivities.grouping.definition.extensions.http://lrs&46;learninglocker&46;net/define/extensions/moodle_course.id": cid}).limit(1)
		for row in innerResult:
			groupNode = row['statement']['context']['contextActivities']['grouping']
			for n in groupNode:
				# Break if needed
				if cid in d: break

				interestNode = n['definition']['extensions']
				if 'http://lrs&46;learninglocker&46;net/define/extensions/moodle_course' in interestNode:
					if interestNode['http://lrs&46;learninglocker&46;net/define/extensions/moodle_course']['type'] == 'course':
						d[cid] = interestNode['http://lrs&46;learninglocker&46;net/define/extensions/moodle_course']['shortname']
						break

	response.content_type = 'application/json'
	return dumps(d)

@route('/getModTypes/<courseid>')
def getModTypes(courseid):
	l = []
	response.add_header('Access-Control-Allow-Origin', '*')

	result = statements.distinct("statement.object.definition.extensions.http://lrs&46;learninglocker&46;net/define/extensions/moodle_module.type",
		{"statement.context.contextActivities.grouping.definition.extensions.http://lrs&46;learninglocker&46;net/define/extensions/moodle_course.id": int(courseid),
		'lrs_id': ObjectId(LRS_ID)}
	)
	for mid in result: 
		l.append(mid)

	response.content_type = 'application/json'
	return dumps(l)


@route('/getMods/<courseid>/<modtype>')
def getCourses(courseid, modtype):
	d = {}
	response.add_header('Access-Control-Allow-Origin', '*')

	result = statements.distinct("statement.object.definition.extensions.http://lrs&46;learninglocker&46;net/define/extensions/moodle_module.id", 
		{
		'statement.object.definition.extensions.http://lrs&46;learninglocker&46;net/define/extensions/moodle_module.type': modtype,
		 'statement.context.contextActivities.grouping.definition.extensions.http://lrs&46;learninglocker&46;net/define/extensions/moodle_course.id': int(courseid),
		 # 'lrs_id': ObjectId(LRS_ID)
		 }
	)
	for mid in result:
		if (mid == 1): continue # Skip the site
		
		# Pull Course info for this single unit
		innerResult = statements.find({"statement.object.definition.extensions.http://lrs&46;learninglocker&46;net/define/extensions/moodle_module.id": mid}).limit(1)
		for row in innerResult:
			d[mid] = row['statement']['object']['definition']['extensions']['http://lrs&46;learninglocker&46;net/define/extensions/moodle_module']['name']

	response.content_type = 'application/json'
	return dumps(d)

run(host='0.0.0.0', port=8080, debug=True, reloader=True)