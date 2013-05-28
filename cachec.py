#!/usr/bin/python
# -*- coding: utf-8 -*-
import argparse
import os

parser = argparse.ArgumentParser(description='Load and compile Caché artifacts.')
parser.add_argument(nargs='+', dest='files',
                   help='List of Caché artifacts to process')
parser.add_argument('--cachehome', dest='cache_home',
                    help='Set to root of Caché intallation', 
                    default=os.environ.get("CACHE_HOME"))
parser.add_argument('--namespace', dest='namespace',
                    help='Caché namescape to connect to',
                    default=os.environ.get("CACHE_NAMESPACE"))

args = parser.parse_args()
print args.cache_home

cache_src_file=args.cache_home+'/mgr/'+args.namespace+'/.cachesrc_load'
# green=32m, red=31m, cyan=36m, yellow=33m
print "\033[32mRemoving previous "+cache_src_file
print "\033[0m"
#if os.path.isfile(cache_src_file):
#    os.remove(cache_src_file)
csf = open(cache_src_file,"w+")
print "Searching for files in current directory"
for file in args.files:
    full_file = os.path.realpath(file)
    print "\033[33mAdding:"+full_file
    print "\033[0m"
    csf.write(os.path.realpath(full_file)+"\n")
csf.close()

#print "\033[32mLoading following files:"
#cat $cache_src_file
print "\033[0m"
print "Calling Cache', Is anyone out there?"
print "\033[36m"
command=args.cache_home+'/bin/ccontrol session HS -U '+args.namespace+" ^cachesrc"
os.system(command)
print "\033[0m"

