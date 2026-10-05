### Use reusable components wherever you can
DRY programming guide comes to UI too ... :)

### Use transactions
When saving multiple elements in the DB, use transactions to avoid half-saves.

### (Next.js) ignore flag in useEffect
If a network request gets obsolete (e.g. fetching data for a Select, but switching before the first response arrives; it is useless now right..?) the ignore flag does not consider the response to be set.
The ignore flag should be used in places where React starts the procedure and *can be cancelled*. For instance, when loading the page and useEffect's start to fetch data.
This flag may not be used for user operations (e.g. clicking button to fetch data).

```ts
useEffect(() => {
    let ignore = false;

    //API call...

    return () => {
        ignore = true;
    };
}, []);
```

### UseCallback
Keeps the same function-copy between renders, and only when its dependencies change does it create a new one.

### Derived values (const)
React runs the component's entire *method*, therefore these contants are calculated ("derived") again.
Storing a list's *find* call as derived const is useful and cheap.
These are not states (useState).