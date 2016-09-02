#!/usr/bin/env python

import sys
import time
import os
from datetime import date, datetime, timedelta
from pymongo import MongoClient
import re
import pickle
import cgi
from HTMLParser import HTMLParser
from bson import ObjectId
import csv
import threading

import cgitb; cgitb.enable() # For troubleshooting
from pprint import pprint # For nice list output

"""
	Author: Ed Moore
	Project: MOAT
	Version: 0.0.1

	Desc here

	Revision Notes
	--------------
	

"""

###################
# Script Settings
###################

# Application Settings
QUERY_NO = 3
MAX_RESULT_SET = 30
CACHE_MINS = 1440
MINUS_LINKS = 2
PLUS_LINKS = 1
TESTING = False
PICKLE  = True
HIDE_NO_MATCH = False
GENERALISE_TYPES = ['http://docs.moodle.org/en/Quiz', 'http://docs.moodle.org/en/Page', 'http://docs.moodle.org/en/Forum_module']

# Pickle Settings
PICKLE_DIR = "../pickles/"
PICKLE_PATH = PICKLE_DIR + 'query' + str(QUERY_NO) + '.pkl'

# LRS Settings
LRS_ID 			= "xxxxxxxxxxxxxxxxxxxxxxxx"


##################
# START PROGRAM
##################
print "Content-type: text/html"
# print 	# This breaks the threading



class MLStripper(HTMLParser):
    def __init__(self):
        self.reset()
        self.strict = False
        self.convert_charrefs= True
        self.fed = []
    def handle_data(self, d):
        self.fed.append(d)
    def get_data(self):
        return ''.join(self.fed)

def strip_tags(html):
    s = MLStripper()
    s.feed(html)
    return s.get_data()

def is_numeric(n):
	try:
	   val = int(n)
	   return True
	except ValueError:
	   return False

def getGrade(studID):
	try:
		studID = int(studID)
	except:
		return "STAFF"

	try:
		for pair in myGrades:
			if int(pair[0]) == studID:
				return pair[1]
	except:
		return 'NO_GRADE'

	return 'NO_GRADE'


def dummyHeader():
	# This function prints a header into the header. This is meant to stop the page from timing out.
	# It also uses threading to setup a call every minute (timeout is 2mins).
	global threadTimer
	print "Dummy: someRandomString"
	threadTimer = threading.Timer(45, dummyHeader)
	threadTimer.start()


# If being run directly
if 'GATEWAY_INTERFACE' in os.environ:
	form = cgi.FieldStorage()
	COURSE = str(form['courseid'].value)
	MINUS_LINKS = int(form['numMinus'].value)
	MOD_ID = form['modID'].value
	MOD_NAME = form['modtype'].value
else:
	print "--DEBUGGING"
	COURSE = "19371"
	MINUS_LINKS = 4
	MOD_ID = "48729"
	MOD_NAME = "quiz"
	DATAFILE = "grades.csv"



# Get the uploaded file and import into myGrades
myGrades = []
if 'GATEWAY_INTERFACE' in os.environ and 'dataFile' in form:
	myForm = form['dataFile']
	if myForm.type == 'text/csv':
		for key in myForm.value.split('\n'):
			# Skip variables that are not integer based
			if is_numeric(key[1:2]):
				myGrades.append(map(str.strip, key.split(',')))
else:
	# Read the whole damn file into memory (it can't possibly be that big!)
	with open(DATAFILE, 'r') as content_file:
		content = content_file.read()
		for key in content.split('\n'):
			if is_numeric(key[1:2]):
				myGrades.append(map(str.strip, key.split(',')))

timerStart = time.time()
threadTimer = None
links = []
if PICKLE and os.path.isfile(PICKLE_PATH) and (datetime.fromtimestamp(os.path.getmtime(PICKLE_PATH)) > (datetime.now()-timedelta(minutes=CACHE_MINS))):
	pkl = open(PICKLE_PATH, 'rb')
	nodes = pickle.load(pkl)
	links = pickle.load(pkl)
else:
	# Connect to Mongodb
	client = MongoClient()
	db = client.learninglocker

	try:
		statements = db.statements
	except:
		print "Failed to connect to Mongodb"
		sys.exit(1)

	query = {
		'statement.context.extensions.http://lrs&46;learninglocker&46;net/define/extensions/moodle_logstore_standard_log.courseid': int(COURSE),
		# 'timestamp': 											{'$gt': datetime(2015, 01, 01, 0, 0, 0)},
		# 'timestamp': 											{'$lt': datetime(2015, 03, 31, 0, 0, 0)},
		# 'statement.actor.account.name': 						re.compile("^[0-9]{8}$", re.IGNORECASE),
		'statement.context.extensions.http://lrs&46;learninglocker&46;net/define/extensions/moodle_logstore_standard_log.objectid':	int(MOD_ID),
		'statement.context.extensions.http://lrs&46;learninglocker&46;net/define/extensions/moodle_logstore_standard_log.objecttable':	MOD_NAME,
		'lrs_id': 												ObjectId(LRS_ID)
	}

	result = statements.find( query ).sort([("statement.actor.account.name", 1), ("timestamp", 1)])
	lastRecord = None
	studCount = 0
	studList = []
	nodes = []
	links = []
	dummyHeader()
	for row in result:
		userID = row['statement']['actor']['account']['name']
		
		# TESTING - ONLY TEST - SERIOUSLY REMOVE ME
		if HIDE_NO_MATCH and len(myGrades) > 0:
			if getGrade(userID) == "NO_GRADE": continue

		# Only look at one attempt per student
		if userID in studList: continue
		studList.append(userID)

		# Insert this as a node if required
		if len(nodes) == 0:
			nodes.append({
				'level':	0,
				'uri':		row['statement']['object']['id'],
				'name':		row['statement']['object']['definition']['name']['en'],
			})


		# Query the MINUS_LINKS most recent actions prior to this one
		innerResult = statements.find({
			'statement.context.contextActivities.grouping.id':		row['statement']['context']['contextActivities']['grouping'][0]['id'],
			'timestamp': 											{'$lt': row['timestamp']},
			# 'statement.actor.account.name': 						re.compile("^[0-9]{8}$", re.IGNORECASE),
			'statement.object.id':									{'$ne': row['statement']['object']['id']},
			'statement.object.definition.type':						{'$ne': "http://docs.moodle.org/en/Add_a_new_user"},	# Don't show view profile actions
			'statement.actor.account.name': 						userID,
			'lrs_id': 												ObjectId(LRS_ID)
		}).sort([("timestamp", 1)])

		level = 0
		prevNode = 0
		for innerRow in innerResult:
			# Search for a matching node
			thisNode = {
				'level':	level,
				'uri':		innerRow['statement']['object']['id'],
				'name':		innerRow['statement']['object']['definition']['name']['en'],
			}
			thisNodeIndex = -1

			# Skip this link if the node is the same as the previous one
			if thisNode['uri'] == nodes[prevNode]['uri']: continue

			# Reduce the level
			level -= 1
			
			for i, n in enumerate(nodes):
				# if n['level'] == thisNode['level'] and n['uri'] == thisNode['uri']:
				if n['level'] == thisNode['level'] and n['name'] == thisNode['name']:
					thisNodeIndex = i
					break
			# Insert a node if there's no match
			if thisNodeIndex < 0:
				nodes.append(thisNode)
				thisNodeIndex = len(nodes)-1

			if thisNodeIndex == prevNode: continue

		
			# Search for the link
			thisLink = {
				'source':	thisNodeIndex,
				'target':	prevNode,
				'grade':	getGrade(userID),
				'weight':	1
			}		

			thisLinkIndex = -1
			for i, n in enumerate(links):
				if n['source'] == thisLink['source'] and n['target'] == thisLink['target'] and n['grade'] == thisLink['grade']:
					thisLinkIndex = i
					links[i]['weight'] += 1
					break
			# Insert a link if there's no match
			if thisLinkIndex < 0:
				links.append(thisLink)
				thisLinkIndex = len(links)-1

			# Save the current Node as Prev
			prevNode = thisNodeIndex

			# Break the loop if required
			if abs(level) == MINUS_LINKS: break;

	# Pickle the results if required
	if PICKLE:
		pkl = open(PICKLE_PATH, 'wb')
		pickle.dump(nodes, pkl, pickle.HIGHEST_PROTOCOL)
		pickle.dump(links, pkl, pickle.HIGHEST_PROTOCOL)
		pkl.close()

	# Output the lists into nice JSON format for the javascript
	threadTimer.cancel()

print # Required to seperate from headers
print "{\n\"nodes\":["
print ",\n".join("{\"node\":" + str(i) + ", \"name\":\"" + strip_tags(n['name'].encode('utf-8').strip()) + "\"}" for i,n in enumerate(nodes))
print "],\n\"links\":["
print ",\n".join("{\"source\":" + str(n['source']) + ", \"target\":" + str(n['target']) + ", \"value\":" + str(n['weight']) + ", \"grade\":\"" + str(n['grade']) + "\"}" for i,n in enumerate(links))
print "]}\n"


# print "Run in " + str(time.time()-timerStart)