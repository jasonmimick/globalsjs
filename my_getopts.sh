while getopts a:b:c:d: opt
    do
        case $opt in
        a)  echo "You said a! $OPTARG";;
        b)  echo "You said b! $OPTARG";;
        c)  echo "You said c! $OPTARG";;
        d)  echo "You said d! $OPTARG";;
        *)     #unknown
            echo "Why don't you tell me the movie you want?"
        esac
    done
echo "OPTARG=$OPTARG"

shift $(($OPTIND -1))

echo "Welcome,$1"
