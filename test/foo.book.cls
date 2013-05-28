class foo.book extends %Library.Persistent {

property Title As %String;

property Author As %String;

property Subject As %String;

property ISBN As %String;

method %OnNew(Title As %String) As %Status {
    set ..Title = Title
    set ..Subject=""
    quit $$$OK
}

/// Returns an array of the subjects
method getSubjects(Output subjects) {
    set stmt=##class(%SQL.Statement).%New()
    set sql = "select ID, Subject from foo.Book"
    set sc = stmt.%Prepare(sql)
    throw:$$$ISERR(sc) ##class(%Exception.StatusException).CreateFromStatus(sc)
    set result = stmt.%Execute()
    while ( result.%Next() ) {
        set subjects( result.%Get("Subject") ) = result.%Get("ID")
    }
}

classmethod version() As %String {
    return $ZV
}
}

