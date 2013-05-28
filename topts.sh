#!/bin/bash
for i in $*
do
case $i in
    -p=*|--prefix=*)
    PREFIX=`echo $i | sed 's/[-a-zA-Z0-9]*=//'`

    ;;
    -s=*|--searchpath=*)
    SEARCHPATH=`echo $i | sed 's/[-a-zA-Z0-9]*=//'`
    ;;
    -l=*|--lib=*)
    DIR=`echo $i | sed 's/[-a-zA-Z0-9]*=//'`
    ;;
    --default)
    DEFAULT=YES
    ;;
    *)
            # unknown option
    ;;
esac
done
echo PREFIX = ${PREFIX}
echo SEARCH PATH = ${SEARCHPATH}
echo DIRS = ${DIR}